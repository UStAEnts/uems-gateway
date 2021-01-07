// External dependencies.
import helmet from 'helmet';
import express from 'express';
import logger from 'morgan';
import * as Cors from 'cors'; // Cors library used to handle CORS on external endpoints.
import * as BodyParser from 'body-parser'; // Bodyparser used to handle JSON content in messages.
import amqp from 'amqplib';
import cors from 'cors';
import jwt, { VerifyOptions } from 'jsonwebtoken';

// Internal dependencies.
import { UemsAuth } from './UemsAuth';
import { GatewayMk2 } from './Gateway';
import { VenueGatewayInterface } from './attachments/attachments/VenueGatewayInterface';
import { EventGatewayAttachment } from './attachments/attachments/EventGatewayAttachment';
import { EntStateGatewayInterface } from './attachments/attachments/EntStateGatewayInterface';
import { UserGatewayInterface } from './attachments/attachments/UserGatewayInterface';
import { EquipmentGatewayInterface } from './attachments/attachments/EquipmentGatewayInterface';
import { StateGatewayInterface } from './attachments/attachments/StateGatewayInterface';
import { SystemGatewayInterface } from './attachments/system/SystemGatewayInterface';
import { TopicGatewayInterface } from "./attachments/attachments/TopicGatewayInterface";
import { FileGatewayInterface } from "./attachments/attachments/FileGatewayInterface";

const fs = require('fs').promises;
const passport = require('passport'); // Passport is used for handling external endpoint authentication.
const AuthStrategy = require('passport-http-bearer').Strategy;

const JWT_PUBLIC_KEY = Buffer.from('2d2d2d2d2d424547494e205055424c4943204b45592d2d2d2d2d0a4d4947624d42414742797147534d343941674547425375424241416a413447474141514150686a724a6f354f6d697337574f3671626f6167435878484348436c0a58485436547a71312f3667737075565450573448716f4278624d534f2f52766d4c7568466c664a44323751506847437377766645504246692b77454177364a590a494f2b70314157384d626d706d2f6e676b61756c47484873643538383154566e6b526a467053785067774b61462f704876325248617a62494d53306e6d5853530a554d50703238484b512f4f652b6970513236733d0a2d2d2d2d2d454e44205055424c4943204b45592d2d2d2d2d0a', 'hex');
const RABBIT_MQ_CONFIG: string = 'rabbit-mq-config.json';

// CORS configuration.
const corsOptions: Cors.CorsOptions = {
    origin: '*',
    methods: 'GET,OPTIONS,PATCH,POST,DELETE',
    optionsSuccessStatus: 200,
};

// Authentication configuration.
passport.use(new AuthStrategy(UemsAuth.authFunction));

const app = express();
app.use(helmet());

// Enable preflight CORS for all routes.
// @ts-ignore
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

console.log('Starting uems-gateway...');

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(BodyParser.json());

// We need to verify that all requests to the gateway have a valid JSON Web Token
// This token is used to identify that the client has authenticated via the frontend
// server and that the request should be made on behalf of them. JWTs have the following
// properties
// * Data:
//   * ip
//   * userID
// * Settings
//   * ES512
//   * Expires in 20 minutes (in production, in development these may be any amount of time)
//   * Issuer: uems.frontend
//   * Audience: uems.gateway
//   * Subject: identifier
// Public and private keys MUST be regenerated before going into production to invalidate
// all keys me in development. Keys without expiry should only be used in development and
// any key that does not expire that is received in production should be rejected and warned
// Invalidation messages may be received from the frontend server via alternate channels. Any
// key that is invalidated should be stored and compared until it has reached its expiry time
// at which point is can be discarded (with a buffer if desired). Invalidations will only be
// sent when the user logs out. Expired JWTs must be sent with a meaningful response so the client
// can easily identify that they need to refresh with the server
// TODO: add invalidated tokens to storage
const ConditionalJWTVerifyOptions: Partial<VerifyOptions> = process.env.NODE_ENV === 'dev' ? {
    // If we're in development then we want to accept any token basically regardless of age
    // this adds some additional protection because if we only use expired tokens in development
    // they therefore literally cannot be used in production if leaked and someone fucks the keys
    // even though thats unlikely. Also this saves me having to generate myself keys when they expire,
    // maybe thats the primary reason, maybe not but I can pretend its for added security
    ignoreExpiration: true,
} : {
    maxAge: '20m',
};

app.use((req, res, next) => {
    const header = req.header('X-UEMS-Identifier');
    if (header === undefined) {
        res.status(401)
            .send('authentication token must be included in the request as a header');
        return;
    }

    try {
        const object = jwt.verify(header, JWT_PUBLIC_KEY, {
            algorithms: ['ES512'],
            audience: 'uems.gateway',
            issuer: 'uems.frontend',
            subject: 'identifier',
            ...ConditionalJWTVerifyOptions,
        }) as string | Record<string, any>;

        // If its valid then we want to check that this is valid and it has a user ID and that it is a string and
        // check that it has an IP and that the ip is valid
        if (typeof (object) === 'string') throw new Error('invalid token: not object');
        if (!Object.prototype.hasOwnProperty.call(object, 'userID')) throw new Error('invalid token: no userID');
        if (!Object.prototype.hasOwnProperty.call(object, 'ip')) throw new Error('invalid token: no ip');
        if (typeof (object.userID) !== 'string') throw new Error('invalid token: user id is not a string');
        if (typeof (object.ip) !== 'string') throw new Error('invalid token: ip is not a string');
        if (req.ip !== object.ip) throw new Error('invalid token: ip does not match');

        req.uemsJWT = {
            ip: object.ip,
            userID: object.userID,
        };

        next();
    } catch (e) {
        if (e.name === 'TokenExpiredError') {
            res.status(401)
                .send('authentication token has expired, please refresh');
            return;
        }

        res.status(401)
            .send('invalid authentication token');
    }
});

// Event get requests use queries so the query parser must be enabled.
app.set('query parser', 'extended');

function initFinished() {
    app.listen(app.get('port'));

    console.log(`Started uems-gateway on ${app.get('port')}`);
}

function main() {
    console.log('Attempting to connect to rabbit-mq...');

    fs.readFile(RABBIT_MQ_CONFIG)
        .then((data: Buffer) => {
            const configJson = JSON.parse(data.toString());

            amqp.connect(`${configJson.uri}?heartbeat=60`)
                .then((conn) => {
                    conn.on('error', (connectionError: Error) => {
                        if (connectionError.message !== 'Connection closing') {
                            console.error('[AMQP] conn error', connectionError.message);
                        }
                    });
                    conn.on('close', () => {
                        console.error('[AMQP] connection closed');
                    });
                    console.log('[AMQP] connected');

                    GatewayMk2.GatewayMessageHandler.setup(conn, app, [
                        // passport.authenticate('bearer', {
                        //     session: false,
                        // }),
                        // Cors.default(corsOptions),
                    ])
                        .then((handler) => {
                            handler.registerEndpoints(new VenueGatewayInterface());
                            handler.registerEndpoints(new EventGatewayAttachment());
                            handler.registerEndpoints(new SystemGatewayInterface());
                            handler.registerEndpoints(new EntStateGatewayInterface());
                            handler.registerEndpoints(new StateGatewayInterface());
                            handler.registerEndpoints(new UserGatewayInterface());
                            handler.registerEndpoints(new EquipmentGatewayInterface());
                            handler.registerEndpoints(new TopicGatewayInterface());
                            handler.registerEndpoints(new FileGatewayInterface());

                            initFinished();
                        })
                        .catch((err) => {
                            console.error('[app]: failed to launch: setup went wrong', err);
                        });
                })
                .catch((error) => {
                    if (error) {
                        // Attempt reconnect if initial messaging connection fails. This is useful if gateway
                        // is started before messaging system.
                        console.error('[AMQP]', error.message);
                        setTimeout(main, 2000);
                    }
                });
        })
        .catch((reason: any) => {
            console.error('Failed to read rabbit-mq config... exiting');
            console.error(reason);
        });
}

main();

module.exports = app;
