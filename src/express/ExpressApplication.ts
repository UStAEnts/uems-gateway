import * as z from 'zod';
import express, { Application, Request, Response } from 'express';
import { auth, requiresAuth } from 'express-openid-connect';
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
    private _app: Application;

    private _configuration: ExpressConfigurationType;

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
            store: new MongoStore({
                url: configuration.session.mongoURL,
                secret: configuration.session.secrets.mongo,
                collection: configuration.session.collection,
                ttl: configuration.session.sessionTimeToLive,
            }),
        }));

        // Then register the Auth0 Authentication manager using all the config options
        this._app.use(auth(configuration.auth0));
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
                    this._app[value.action].bind(this._app)(value.path, requiresAuth(), handle);
                } else {
                    this._app[value.action].bind(this._app)(value.path, handle);
                }

                __.info(`[register endpoints]: trying to register ${value.action} with path ${value.path}`, {
                    secure,
                });
            });
        }
    }

    async react() {
        this._app.use(requiresAuth(), express.static(join(__dirname, '..', '..', this._configuration.uems.serve)));
        this._app.get('/', requiresAuth(), (req, res) => {
            res.sendFile(join(__dirname, '..', '..', this._configuration.uems.index));
            // res.json(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
        });
    }

    listen() {
        this._app.listen(this._configuration.port ?? 15450);
    }
}
