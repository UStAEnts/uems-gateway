// Handles receiving a HTTP REST request and processing that into a message
// to be sent onto a microservice.

import { Channel, Message } from 'amqplib/callback_api';
import { Connection as Connection_ } from 'amqplib';
import { Application, Request, RequestHandler, Response } from 'express';
import { MessageUtilities } from './utilities/MessageUtilities';
import { ErrorCodes } from './constants/ErrorCodes';
import { constants } from 'http2';
import { EntityResolver } from './resolver/EntityResolver';
import { MessageValidator } from '@uems/uemscommlib/build/messaging/MessageValidator';

// The queue of messages being sent from the microservices back to the gateway.
const RCV_INBOX_QUEUE_NAME: string = 'inbox';

// The exchange used for sending messages back to the gateway(s).
const GATEWAY_EXCHANGE: string = 'gateway';

// The exchange used for fanning / distributing requests out to the microservices.
const REQUEST_EXCHANGE: string = 'request';

type OutStandingReq = {
    unique_id: Number,
    response: Response,
    callback: Function,
    // TODO: Timestamp.
};

export namespace GatewayMk2 {
    export type JSONType = Record<string, any> | any[] | string | number | boolean | null;
    export type MinimalMessageType = {
        msg_id: number,
        status: number,
    } & Record<string, any>;
    export type RequestCallback = (http: Response, timestamp: number, response: MinimalMessageType, status: number) => void;
    type PendingRequest = {
        uid: number,
        response: Response,
        callback: RequestCallback,
        timestamp: number,
        additionalValidator?: MessageValidator,
    };
    export type SendRequestFunction = (key: string, message: { msg_id: number, [key: string]: any }, response: Response, callback: RequestCallback) => Promise<boolean>;
    export type GatewayInterfaceActionType = {
        action: 'get' | 'delete' | 'post' | 'patch',
        path: string,
        handle: RequestHandler,
        additionalValidator?: MessageValidator,
    };

    export class GatewayMessageHandler {
        /**
         * Active connection to the amqplib messaging system
         */
        private connection: Connection_;

        /**
         * The channel on which requests should be sent out to the microservices
         */
        private sendChannel: Channel;

        /**
         * The channel on which requests should be received from the microservices
         */
        private receiveChannel: Channel;

        /**
         * The current cache of outstanding requests which are awaiting being resolved
         */
        private outstandingRequests: Map<number, PendingRequest>;

        /**
         * The basic validator to be run against incoming messages, before entry specific validators are executed
         */
        private basicValidator: MessageValidator | undefined;

        /**
         * The application through which the gateway is functioning
         * @private
         */
        private _application: Application;

        /**
         * The middlewares to be applied to any route
         * @private
         */
        private middlewares: RequestHandler[];

        /**
         * The interval bound to the terminator function which closes requests after minimum amounts of time
         * @private
         */
        private terminatorInterval: NodeJS.Timeout;

        /**
         * The entity resolver instance which will be used to intercept results for resolved entities
         * @private
         */
        private resolver: EntityResolver = new EntityResolver(this);

        /**
         * Creates a gateway, no side effects. Marked private as the async setup function should be used instead for
         * better handling.
         * @param connection the connection to the amqplib server
         * @param sendChannel the channel on which requests should be sent
         * @param receiveChannel the channel on which responses should be received
         * @param basicValidator the basic validator to be run against incoming messages
         * @private
         */
        private constructor(
            connection: Connection_,
            sendChannel: Channel,
            receiveChannel: Channel,
            basicValidator: MessageValidator | undefined,
            application: Application,
            middlewares: RequestHandler[],
        ) {
            this.connection = connection;
            this.sendChannel = sendChannel;
            this.receiveChannel = receiveChannel;
            this.outstandingRequests = new Map<number, PendingRequest>();
            this.basicValidator = basicValidator;
            this._application = application;
            this.middlewares = middlewares;

            this.terminatorInterval = setInterval(this.terminateTimedOut, 2000);
        }

        /**
         * Terminates requests after 15 seconds of waiting. Will free up in use keys as well
         * @private
         */
        private readonly terminateTimedOut = () => {
            const now = new Date().getTime();

            for (const key of this.outstandingRequests.keys()) {
                const entry = this.outstandingRequests.get(key);
                if (entry !== undefined && now - entry.timestamp > 15000) {
                    console.log(`[terminator]: request being terminated: ${entry.uid}@${entry.timestamp}`);

                    // The request has been waiting more than 15 seconds so we tell them that it has timed out
                    entry.response.status(constants.HTTP_STATUS_GATEWAY_TIMEOUT)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.SERVICE_TIMEOUT));

                    // Then remove this request from the outstanding requests
                    this.outstandingRequests.delete(key);

                    // And free up its message ID
                    MessageUtilities.identifierConsumed(entry.uid);
                }
            }
        };

        public static async setup(connection: Connection_, application: Application, middlewares: RequestHandler[]) {
            let channel;

            try {
                channel = await connection.createChannel();
            } catch (e) {
                console.error('[gateway setup]: failed to initialise due to failing to create the channel');
                throw e;
            }

            // Now make sure the exchange we're sending requests to exists
            try {
                await channel.assertExchange(REQUEST_EXCHANGE, 'topic', {
                    durable: false,
                });
            } catch (e) {
                console.error(`[gateway setup]: failed to initialise due to failing to assert the exchange (${REQUEST_EXCHANGE})`);
                throw e;
            }

            // And then try to create another channel for receiving on
            let receive;
            try {
                receive = await connection.createChannel();
            } catch (e) {
                console.error('[gateway setup]: failed to initialise due to failing to create the receiving channel');
                throw e;
            }

            // Then try to assert the gateway
            try {
                await receive.assertExchange(GATEWAY_EXCHANGE, 'direct');
            } catch (e) {
                console.error(`[gateway setup]: failed to initialise due to failing to assert the gateway exchange (${GATEWAY_EXCHANGE})`);
                throw e;
            }

            // And the inbox queue
            let queue;
            try {
                queue = await receive.assertQueue(RCV_INBOX_QUEUE_NAME, { exclusive: true });
            } catch (e) {
                console.error(`[gateway setup]: failed to initialise due to failing to assert the inbox queue (${RCV_INBOX_QUEUE_NAME})`);
                throw e;
            }

            // Then bind the inbox to the exchange
            try {
                await receive.bindQueue(RCV_INBOX_QUEUE_NAME, GATEWAY_EXCHANGE, '');
            } catch (e) {
                console.error(`[gateway setup]: failed to initialise due to failing to bind the inbox (${RCV_INBOX_QUEUE_NAME}) to the exchange (${GATEWAY_EXCHANGE})`);
                throw e;
            }

            // And finally start setting up things
            const handler = new GatewayMk2.GatewayMessageHandler(
                connection,
                channel,
                receive,
                undefined,
                application,
                middlewares,
            );

            try {
                // And bind the incoming messages to the handler
                await receive.consume(queue.queue, handler.handleRawIncoming, {
                    noAck: true,
                });
            } catch (e) {
                console.error('[gateway setup]: failed to initialise due to failing to begin consuming');
                throw e;
            }

            return handler;
        }

        private readonly handleRawIncoming = (message: Message | null) => {
            if (message === null) {
                console.warn('[gateway raw incoming]: null message received, ignoring it');
                return;
            }

            const stringContent = message.content.toString('utf8');
            const json = JSON.parse(stringContent);

            console.log(json);

            if (!MessageUtilities.has(json, 'msg_id') || typeof (json.msg_id) !== 'number') {
                console.warn('[gateway raw incoming]: message was received without an ID. Ignoring');
                return;
            }
            if (!MessageUtilities.has(json, 'status') || typeof (json.status) !== 'number') {
                console.warn('[gateway raw incoming]: message was received without a status. Ignoring');
                return;
            }

            // If this message ID has been sent by the resolver, it will mark it as requiring an intercept
            // in that case we want to send it to it to be consumed
            if (this.resolver.intercept(json.msg_id)) {
                MessageUtilities.identifierConsumed(json.msg_id);
                this.resolver.consume(json);
                return;
            }

            const request = this.outstandingRequests.get(json.msg_id);
            if (request === undefined) {
                console.warn('[gateway raw incoming]: message was received that did not match a pending request. has it already timed out?');
                return;
            }

            this.outstandingRequests.delete(json.msg_id);

            if (request.additionalValidator !== undefined) {
                request.additionalValidator.validate(json)
                    .then((validated) => {
                        if (validated) {
                            request.callback(request.response, request.timestamp, json, json.status);
                        } else {
                            console.warn('[gateway raw incoming]: message was rejected because it didn\'t pass the additional validator');
                        }
                    })
                    .catch((err) => {
                        console.error('[gateway raw incoming]: message was rejected because the validator errored out', err);
                    });
            } else {
                request.callback(request.response, request.timestamp, json, json.status);
            }
        };

        public publish(key: string, data: any) {
            return this.sendChannel.publish(REQUEST_EXCHANGE, key, Buffer.from(JSON.stringify(data)));
        }

        private readonly sendRequest = async (key: string, message: { msg_id: number, [key: string]: any }, response: Response, callback: RequestCallback, validator?: MessageValidator) => {
            console.log('outgoing message', key, message);
            this.outstandingRequests.set(message.msg_id, {
                response,
                callback,
                uid: message.msg_id,
                timestamp: new Date().getTime(),
                additionalValidator: validator,
            });

            return this.publish(key, message);
        };

        public registerEndpoints(attachment: GatewayAttachmentInterface) {
            console.log(`[register endpoints]: registering endpoints with this ${this}`);
            const pending = attachment.generateInterfaces(this.sendRequest, this.resolver);
            Promise.resolve(pending)
                .then((functions) => {
                    for (const route of functions) {
                        const action = this._application[route.action].bind(this._application);
                        console.log(`[register endpoints]: trying to register ${route.action} with path ${route.path} and ${this.middlewares.length} middlewares`);
                        const path = [
                            route.path,
                            ...this.middlewares,
                            (req: Request, res: Response) => {
                                // TODO validator
                                route.handle(req, res, () => false);
                            },
                        ];

                        // @ts-ignore
                        action.apply(this._application, path);
                    }
                });
        }

        get application(): Application {
            return this._application;
        }
    }

    export interface GatewayAttachmentInterface {

        generateInterfaces(send: SendRequestFunction, resolver: EntityResolver): GatewayInterfaceActionType[] | Promise<GatewayInterfaceActionType[]>;

    }
}
