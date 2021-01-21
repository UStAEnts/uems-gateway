import * as z from 'zod';
import express, { Application, IRoute, IRouter, Request, RequestHandler, Response, Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectMongo from 'connect-mongo';
import { GatewayMk2 } from '../Gateway';
import { EntityResolver } from '../resolver/EntityResolver';
import { join } from 'path';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import { __ } from "../log/Log";
import { UserMessage } from "@uems/uemscommlib";
import AssertUserMessage = UserMessage.AssertUserMessage;
import { MessageUtilities } from "../utilities/MessageUtilities";
import KeycloakConnect, { Keycloak } from "keycloak-connect";
import * as util from "util";
import { constants } from "http2";

const MongoStore = connectMongo(session);

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
        'confidential-port': z.string()
            .or(z.number()),
        'auth-server-url': z.string(),
        resource: z.string(),
        'ssl-required': z.string(),
        'bearer-only': z.boolean()
            .optional(),
        realm: z.string(),
        credentials: z.object({
            secret: z.string(),
        })
            .optional(),
        'public-client': z.boolean()
            .optional(),
    })
        .nonstrict(),
    auth0: z.object({
        secret: z.string()
            .or(z.array(z.string()))
            .optional(),
        auth0Logout: z.boolean()
            .optional(),
        baseURL: z.string()
            .optional(),
        clientID: z.string()
            .optional(),
        clientSecret: z.string()
            .optional(),
        clockTolerance: z.number(),
        enableTelemetry: z.boolean(),
        errorOnRequiredAuth: z.boolean(),
        attemptSilentLogin: z.boolean(),
        identityClaimFilter: z.array(z.string()),
        idpLogout: z.boolean(),
        idTokenSigningAlg: z.string(),
        issuerBaseURL: z.string(),
        legacySameSiteCookie: z.boolean(),
        authRequired: z.boolean(),
        routes: z.object({
            login: z.string()
                .or(z.literal(false)),
            logout: z.string()
                .or(z.literal(false)),
            postLogoutRedirect: z.string(),
            callback: z.string(),
        }),
        clientAuthMethod: z.string(),
    })
        .deepPartial(),
});

export type ExpressConfigurationType = z.infer<typeof ExpressConfiguration>;

export class ExpressApplication {
    private static readonly DISABLE_PROTECTIONS = true;

    private _app: Application;

    private _configuration: ExpressConfigurationType;

    private _apiRouter: Router;

    private _keycloak: Keycloak;

    private _protector: () => RequestHandler;

    constructor(configuration: ExpressConfigurationType) {
        this._configuration = configuration;
        this._app = express();

        // Bind helmet
        //   Overriding content security policies to try and keep them tight
        //   We will restrict the sources to being from here or to those identified with specific hashes
        //   We pull these from the config as these will be different for every single deployment
        this._app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    'manifest-src': ["'self'", ...configuration.auth.manifestSrc],
                    'script-src': ["'self'", ...configuration.uems.hashes.map((e) => `'${e}'`)],
                    'connect-src': ["'self'"],
                    'img-src': ['*']
                },
            },
        }));

        // Cors from domains in the config on all the CRUD HTTP operations
        this._app.use(cors({
            origin: configuration.cors.origins,
            methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
        }));

        // Parsing JSON and urlencoded payloads. Only supporting flat data
        this._app.use(express.json());
        this._app.use(express.urlencoded({ extended: false }));

        const store = new MongoStore({
            url: configuration.session.mongoURL,
            secret: configuration.session.secrets.mongo,
            collection: configuration.session.collection,
            ttl: configuration.session.sessionTimeToLive,
        });

        this._keycloak = new KeycloakConnect({
            store,
        }, configuration.keycloak);

        this._protector = ExpressApplication.DISABLE_PROTECTIONS
            ? () => ((req, res, next) => next())
            : this._keycloak.protect;

        // Configure sessions for users that need to be backed by the database using connect-mongo.
        this._app.use(session({
            saveUninitialized: true,
            resave: true,
            secret: configuration.session.secrets.session,
            name: configuration.session.name,
            cookie: {
                domain: configuration.session.domain,
                path: '/',
                maxAge: 24 * 60 * 60 * 1000,
                secure: configuration.session.secure,
            },
            store,
        }));

        // Then register the Auth0 Authentication manager using all the config options
        this._app.use(this._keycloak.middleware());
        // this._app.use(auth({
        //     ...configuration.auth0,
        // }));

        this._apiRouter = express.Router();
        if(ExpressApplication.DISABLE_PROTECTIONS) {
            this._app.use((req, res, next) => {
                req.uemsUser = {
                    userID: '3800de91-5c28-46e9-b501-27703ea32aed',
                    username: 'debug',
                    email: 'debug@debuggy.com',
                    fullName: 'Debug Davids',
                    profile: 'https://placehold.it/200x200',
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
        __.info('created a new API router');
    }

    async attach(attachments: GatewayAttachmentInterface[], send: SendRequestFunction, resolver: EntityResolver) {
        const resolvedAttachments = await Promise.all(
            attachments.map((attachment) => attachment.generateInterfaces(send, resolver)),
        );

        for (const attachment of resolvedAttachments) {
            attachment.forEach((value) => {
                const secure = value.secure ?? true;
                const handle = (req: Request, res: Response) => value.handle(req, res, () => false);

                if (secure) {
                    this._apiRouter[value.action].bind(this._apiRouter)(
                        value.path,
                        this._protector(),
                        (req, res) => {
                            if (req.uemsUser === undefined) {
                                res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                                return;
                            }

                            handle(req, res);
                        },
                    );
                } else {
                    this._apiRouter[value.action].bind(this._apiRouter)(value.path, handle);
                }

                __.info(`[register endpoints]: trying to register ${value.action} with path ${value.path}`, {
                    secure,
                });
            });
        }
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
                hash: '',
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
}
