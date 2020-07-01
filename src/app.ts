// External dependencies.
const express = require('express');
const logger = require('morgan');
const passport = require('passport');
const AuthStrategy = require('passport-http-bearer').Strategy;
const amqp = require('amqplib/callback_api');
const fs = require('fs');

import { Connection } from 'amqplib';
import { Request, Response } from 'express';
// Internal dependencies.
import { GatewayMessageHandler } from './message_handling';

let msgHandler: GatewayMessageHandler | null = null;

const app = express();

console.log('Starting uems-gateway...');

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Event get requests use queries so the query parser must be enabled.
app.set('query parser', 'extended');

passport.use(new AuthStrategy(
    // TODO, Authentication.
    (token: any, done: Function) => done(null, 1),
));

function initFinished() {
    app.listen(app.get('port'));

    console.log('Started uems-gateway');
}

function main() {
    console.log('Attempting to connect to rabbit-mq...');
    fs.readFile('rabbit-mq-config.json', 'utf8', (err: Error, data: string) => {
        if (err) {
            console.error('Failed to read rabbit-mq config... exiting');
            return;
        }

        const configJson = JSON.parse(data);

        amqp.connect(`${configJson.uri}?heartbeat=60`, async (error: Error, conn: Connection) => {
            if (error) {
                console.error('[AMQP]', error.message);
                setTimeout(main, 2000);
                return;
            }

            conn.on('error', (connectionError: Error) => {
                if (connectionError.message !== 'Connection closing') {
                    console.error('[AMQP] conn error', connectionError.message);
                }
            });
            conn.on('close', () => {
                console.error('[AMQP] connection closed');
            });
            console.log('[AMQP] connected');

            msgHandler = await GatewayMessageHandler.setup(conn);

            // CREATE
            app.post('/events', passport.authenticate('bearer', { session: false }), msgHandler.add_events_handler);

            // READ
            // Examplar usage: curl -v http://127.0.0.1:15450/events/?access_token=1
            //
            // GET query params:
            // access_token: The access token used for authentication (currently unused but required).
            // name: Human readable name, default = all.
            // start_date_before: The event must have a start date after start_date_after and before start_date_before.
            // start_date_after:  The default is all events.
            // end_date_before: The event must have an end date after end_date_after and before end_date_before.
            // end_date_after:  The default is all events.
            //
            app.get(
                '/events',
                passport.authenticate('bearer', {
                    session: false,
                }),
                msgHandler.get_events_handler,
            );

            // UPDATE
            app.patch(
                '/events',
                passport.authenticate('bearer', {
                    session: false,
                }),
                msgHandler.modify_events_handler,
            );

            // DELETE
            app.delete(
                '/events',
                passport.authenticate('bearer', {
                    session: false,
                }),
                msgHandler.remove_events_handler,
            );

            app.get(
                '/',
                (req: Request, res: Response) => res.send('Test Path, Get Req Received'),
            );

            app.get(
                '/status',
                (req: Request, res: Response) => res.send('Ok'),
            );

            initFinished();
        });
    });
}

main();

process.on('exit', () => {
    if (msgHandler !== null) msgHandler.close();
});

module.exports = app;
