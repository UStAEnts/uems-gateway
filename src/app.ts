// External dependencies.
import helmet from 'helmet';
import express from 'express';
import logger from 'morgan';
import * as Cors from 'cors'; // Cors library used to handle CORS on external endpoints.
import * as BodyParser from 'body-parser'; // Bodyparser used to handle JSON content in messages.
import amqp from 'amqplib';

// Internal dependencies.
import { UemsAuth } from './UemsAuth';
import { GatewayMk2 } from './Gateway';
import { VenueGatewayInterface } from './attachments/venues/VenueGatewayInterface';
import { EventGatewayAttachment } from './attachments/events/EventGatewayAttachment';

const fs = require('fs').promises;
const passport = require('passport'); // Passport is used for handling external endpoint authentication.
const AuthStrategy = require('passport-http-bearer').Strategy;

const RABBIT_MQ_CONFIG: string = 'rabbit-mq-config.json';

// CORS configuration.
const corsOptions: Cors.CorsOptions = {
    origin: 'http://localhost:15300',
    methods: 'GET,OPTIONS,PATCH,POST,DELETE',
    optionsSuccessStatus: 200,
};

// Authentication configuration.
passport.use(new AuthStrategy(UemsAuth.authFunction));

const app = express();
app.use(helmet());

// Enable preflight CORS for all routes.
app.options('*', Cors.default(corsOptions));

console.log('Starting uems-gateway...');

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(BodyParser.json());

// Event get requests use queries so the query parser must be enabled.
app.set('query parser', 'extended');

function initFinished() {
    app.listen(app.get('port'));

    console.log(`Started uems-gateway on ${app.get('port')}`);
}

function main() {
    console.log('Attempting to connect to rabbit-mq...');

    fs.readFile(RABBIT_MQ_CONFIG).then((data: Buffer) => {
        const configJson = JSON.parse(data.toString());

        amqp.connect(`${configJson.uri}?heartbeat=60`).then((conn) => {
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
            ]).then((handler) => {
                handler.registerEndpoints(new VenueGatewayInterface());
                handler.registerEndpoints(new EventGatewayAttachment());

                initFinished();
            }).catch((err) => {
                console.error('[app]: failed to launch: setup went wrong', err);
            });
        }).catch((error) => {
            if (error) {
                // Attempt reconnect if initial messaging connection fails. This is useful if gateway
                // is started before messaging system.
                console.error('[AMQP]', error.message);
                setTimeout(main, 2000);
            }
        });
    }).catch((reason: any) => {
        console.error('Failed to read rabbit-mq config... exiting');
        console.error(reason);
    });
}

main();

module.exports = app;
