import * as z from 'zod';
import express, { Application, Request, RequestHandler, Response, Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session, { MemoryStore } from 'express-session';
import MongoStore from 'connect-mongo';
import { GatewayMk2 } from '../Gateway';
import { EntityResolver } from '../resolver/EntityResolver';
import { join } from 'path';
import { UserMessage } from '@uems/uemscommlib';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { constants } from 'http2';
import { tryApplyTrait } from '@uems/micro-builder/build/src';
import KeycloakConnect from 'keycloak-connect';
import { AuthUtilities } from "../utilities/AuthUtilities";
import { v4 } from 'uuid';
import { logInfo } from "../log/RequestLogger";
import { MongoClient } from "mongodb";
import { Configuration } from "../configuration/Configuration";
import log from '@uems/micro-builder/build/src/logging/Log';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import AssertUserMessage = UserMessage.AssertUserMessage;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import orProtect = AuthUtilities.orProtect;
import ROUTES from "../routes";
import { getAPIEndpoints, methodToString } from "../decorators/endpoint";
import sendZodError = MessageUtilities.sendZodError;
import Attachment = GatewayMk2.Attachment;

// const MongoStore = connectMongo(session);

const _ = log.auto;

export const ExpressConfiguration = z.object({
    port: z.number()
        .optional(),
    cors: z.object({
        origins: z.string()
            .or(z.array(z.string())),
    }),
    uems: z.object({
        index: z.string(),
        serve: z.string(),
        hashes: z.array(z.string()),
    }),
    auth: z.object({
        manifestSrc: z.array(z.string()),
    }),
    session: z.object({
        mongoURL: z.string(),
        name: z.string(),
        secure: z.boolean(),
        domain: z.string(),
        collection: z.string()
            .optional(),
        sessionTimeToLive: z.number()
            .optional(),
        secrets: z.object({
            mongo: z.string(),
            session: z.string(),
        }),
    }),
    keycloak: z.object({
        authServerBase: z.string(),
        realm: z.string(),
        clientID: z.string(),
        secret: z.string(),
        confidentialPort: z.string()
            .or(z.number()),
        sslRequired: z.string(),
    })
        .nonstrict(),
});

export type ExpressConfigurationType = z.infer<typeof ExpressConfiguration>;

export class ExpressApplication {
    private static readonly DISABLE_PROTECTIONS = true;

    private _app: Application;

    private _configuration: ExpressConfigurationType;

    private _apiRouter: Router;

    private _protector: (...x: any[]) => RequestHandler;

    private _debuggingRoleDecider: ((role: string) => boolean) = () => true;

    /**
     * Contains the last set of requests that were successful (anything except internal errors) and failed (internal
     * errors). This is to be synced with the health-check system
     * @private
     */
    private _requestQueue: ('success' | 'fail')[] = [];

    constructor(configuration: ExpressConfigurationType|null, client: MongoClient|null) {
        this._configuration = configuration ?? {
            auth: {
                manifestSrc: [],
            },
            cors: {
                origins: [],
            },
            keycloak: {
                authServerBase: '',
                clientID: '',
                secret: '',
                realm: '',
                confidentialPort: 0,
                sslRequired: '',
            },
            session: {
                name: 'name',
                secure: false,
                domain: 'domain',
                secrets: {
                    session: 'session',
                    mongo: 'mongo',
                },
                mongoURL: 'mongourl',
            },
            uems: {
                hashes: [],
                index: '',
                serve: '',
            },
        };
        this._app = express();

        // Assign the request identifier for logging
        this._app.use((req, res, next) => {
            req.requestID = v4();
            res.requestID = req.requestID;
            res.start = Date.now();

            logInfo(req.requestID, `Request received for ${req.path} at ${Date.now()} assigned ID ${req.requestID}`);
            _(req.requestID)
                .info(`Request received for ${req.method} ${req.path} at ${Date.now()} assigned ID ${req.requestID}`);

            next();
        });


        // Bind helmet
        //   Overriding content security policies to try and keep them tight
        //   We will restrict the sources to being from here or to those identified with specific hashes
        //   We pull these from the config as these will be different for every single deployment
        this._app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    'manifest-src': ["'self'", ...this._configuration.auth.manifestSrc],
                    'script-src': ["'self'", ...this._configuration.uems.hashes.map((e) => `'${e}'`)],
                    'connect-src': ["'self'"],
                    'img-src': ['*'],
                },
            },
        }));

        // Cors from domains in the config on all the CRUD HTTP operations
        this._app.use(cors({
            origin: this._configuration.cors.origins,
            methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
        }));

        // Parsing JSON and urlencoded payloads. Only supporting flat data
        this._app.use(express.json());
        this._app.use(express.urlencoded({ extended: false }));

        const store = client ? new MongoStore({
            client,
        }) : new MemoryStore();

        // Configure sessions for users that need to be backed by the database using connect-mongo.
        this._app.use(session({
            saveUninitialized: true,
            resave: true,
            secret: this._configuration.session.secrets.session,
            name: this._configuration.session.name,
            cookie: {
                domain: this._configuration.session.domain,
                path: '/',
                maxAge: 24 * 60 * 60 * 1000,
                secure: this._configuration.session.secure,
            },
            store,
        }));

        let keycloak!: KeycloakConnect.Keycloak;
        if (!ExpressApplication.DISABLE_PROTECTIONS) {
            keycloak = new KeycloakConnect({
                store,
            }, {
                'auth-server-url': this._configuration.keycloak.authServerBase,
                realm: this._configuration.keycloak.realm,
                resource: this._configuration.keycloak.clientID,
                'confidential-port': this._configuration.keycloak.confidentialPort,
                'ssl-required': this._configuration.keycloak.sslRequired,
                // @ts-ignore - see https://github.com/keycloak/keycloak-nodejs-connect/pull/289
                secret: this._configuration.keycloak.secret,
            });
            this._app.use(keycloak.middleware({
                logout: '/logout',
                admin: '/',
            }));
        }

        this._protector = ExpressApplication.DISABLE_PROTECTIONS
            ? () => ((req, res, next) => next())
            : keycloak.protect.bind(keycloak);

        this._app.use((req, res, next) => {
            res.on('finish', () => {
                // If there are going to be more than 50, remove the oldest so we only consider that 50
                if (this._requestQueue.length >= 50) this._requestQueue.shift();

                // Don't count gateway timeout as that indicates that a microservice has died and doesn't reflect
                // on the gateway so should not be counted as a failed response. I should probably count these
                // differently but for the time being this will work.
                if (res.statusCode >= 500 && res.statusCode < 600
                    && res.statusCode !== constants.HTTP_STATUS_GATEWAY_TIMEOUT) {
                    this._requestQueue.push('fail');
                } else {
                    this._requestQueue.push('success');
                }

                tryApplyTrait('successful', this._requestQueue.filter((e) => e === 'success').length);
                tryApplyTrait('errored', this._requestQueue.filter((e) => e === 'fail').length);

                _(req.requestID)
                    .info(`Request resolved at ${Date.now()} with status 
                    ${res.statusCode} in ${Date.now() - res.start} ms`);
            });

            next();
        });

        this._apiRouter = express.Router();
        if (ExpressApplication.DISABLE_PROTECTIONS) {
            this._app.use((req, res, next) => {
                req.uemsUser = {
                    userID: '3800de91-5c28-46e9-b501-27703ea32aed',
                    username: 'debug',
                    email: 'debug@debuggy.com',
                    fullName: 'Debug Davids',
                    profile: '/default-icon.png',
                };

                // Grant all permissions
                req.kauth = {
                    grant: {
                        access_token: {
                            isExpired: () => false,
                            hasRole: this._debuggingRoleDecider.bind(this),
                        },
                    },
                };

                next();
            });
        }
        this._app.use(this._protector(), (req, res, next) => {
            if (req.kauth && req.kauth.grant && req.kauth.grant.id_token && req.kauth.grant.id_token.content) {
                req.uemsUser = {
                    userID: req.kauth.grant.id_token.content.sub,
                    username: req.kauth.grant.id_token.content.preferred_username,
                    email: req.kauth.grant.id_token.content.email,
                    fullName: req.kauth.grant.id_token.content.name,
                    profile: req.kauth.grant.id_token.content.picture ?? 'https://placehold.it/200x200',
                };
            }
            next();
        });

        this._app.use('/api', this._apiRouter);
        _.system.info('created a new API router');
    }

    async attach(
        send: SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
        configuration: Configuration,
        routes: (typeof Attachment)[] = ROUTES,
    ) {
        const endpoints = routes.map((Class) => {
            // @ts-ignore
            const entry = new Class(resolver, handler, send, configuration);
            return getAPIEndpoints(entry);
        })
            .flat();

        endpoints.forEach((endpoint) => {
            const secure = endpoint.roles ?? false;
            const handle = (req: Request, res: Response) => {
                let {
                    query,
                    body,
                } = req;

                if (endpoint.query) {
                    const parse = endpoint.query.safeParse(query);
                    if (!parse.success) {
                        sendZodError(res, parse.error);
                        return;
                    }

                    query = parse.data;
                }

                if (endpoint.body) {
                    const parse = endpoint.body.safeParse(body);
                    if (!parse.success) {
                        sendZodError(res, parse.error);
                        return;
                    }

                    body = parse.data;
                }

                endpoint.handler(req, res, query, body);
            };

            if (typeof (secure) !== 'boolean') {
                this._apiRouter[methodToString(endpoint.method)].bind(this._apiRouter)(
                    endpoint.simpleRoute,
                    this._protector(orProtect(...secure)),
                    (req, res) => {
                        if (req.uemsUser === undefined) {
                            res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                            return;
                        }

                        handle(req, res);
                    },
                );
            } else {
                this._apiRouter[methodToString(endpoint.method)].bind(this._apiRouter)(endpoint.simpleRoute, handle);
            }

            let logMessage = `[endpoints]: ${methodToString(endpoint.method)
                .toUpperCase()} ${endpoint.route}  `;
            if (endpoint.roles) {
                logMessage += `[✓] secure (${endpoint.roles.join(',')})  `;
            } else {
                logMessage += '[ ] secure  ';
            }

            if (endpoint.query) {
                logMessage += '[✓] query validator  ';
            } else {
                logMessage += '[ ] query validator  ';
            }

            if (endpoint.body) {
                logMessage += '[✓] body validator  ';
            } else {
                logMessage += '[ ] body validator  ';
            }

            _.system.info(logMessage);
        });
        //
        // const resolvedAttachments = await Promise.all(
        //     attachments.map((attachment) => attachment.generateInterfaces(send, resolver, handler, configuration)),
        // );
        //
        // for (const attachment of resolvedAttachments) {
        //     attachment.forEach((value) => {
        //         const secure = value.secure ?? [];
        //         const handle = (req: Request, res: Response) => value.handle(req, res, () => false);
        //
        //         if (typeof (secure) !== 'boolean') {
        //             this._apiRouter[value.action].bind(this._apiRouter)(
        //                 value.path,
        //                 this._protector(orProtect(...secure)),
        //                 (req, res) => {
        //                     if (req.uemsUser === undefined) {
        //                         res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
        //                         return;
        //                     }
        //
        //                     handle(req, res);
        //                 },
        //             );
        //         } else {
        //             this._apiRouter[value.action].bind(this._apiRouter)(value.path, handle);
        //         }
        //
        //         __.info(`[register endpoints]: trying to register ${value.action} with path ${value.path}`, {
        //             secure,
        //         });
        //     });
        // }
    }

    async react(assert: (assert: AssertUserMessage) => void) {
        this._app.use(this._protector(), express.static(join(__dirname, '..', '..', this._configuration.uems.serve)));
        this._app.use(this._protector(), (req, res) => {
            // TODO: find a better way to do this. The page should be the first thing they access once they authenticate
            // because it is the callback URL. Therefore we can use this to assert the user account because we know
            // that the user account is defined here (requiresAuth())
            assert({
                msg_intention: 'ASSERT',
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                userID: 'anonymous',
                email: req.uemsUser.email,
                id: req.uemsUser.userID,
                name: req.uemsUser.fullName,
                profile: req.uemsUser.profile,
                username: req.uemsUser.username,
            });

            res.sendFile(join(__dirname, '..', '..', this._configuration.uems.index));
            // res.json(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
        });
    }

    listen() {
        this._app.listen(this._configuration.port ?? 15450);
    }

    get app(): Application {
        return this._app;
    }

    set debuggingRoleDecider(value: (role: string) => boolean) {
        this._debuggingRoleDecider = value;
    }
}
