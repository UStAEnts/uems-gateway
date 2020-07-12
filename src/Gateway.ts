// Handles receiving a HTTP REST request and processing that into a message
// to be sent onto a microservice.

import { Channel, Connection, Message } from 'amqplib/callback_api';
import { Response, Request, Application } from 'express';
import { PassportStatic } from 'passport'; // Passport is used for handling external endpoint authentication.
import * as Cors from 'cors'; // Cors library used to handle CORS on external endpoints.
import { MessageValidator } from './uemsCommLib/messaging/MessageValidator';
import { ReadRequestResponseMsg, RequestResponseMsg, MsgStatus }
    from './uemsCommLib/messaging/types/event_response_schema';
import { EventMsg, ReadEventMsg, DeleteEventMsg, msgToJson, MsgIntention }
    from './uemsCommLib/messaging/types/event_message_schema';
import * as HttpStatus from 'http-status-codes';
import { EventResponse, InternalEventToEventResponse } from './types/GatewayTypes';

const fs = require('fs').promises;

// The queue of messages being sent from the microservices back to the gateway.
const RCV_INBOX_QUEUE_NAME: string = 'inbox';

// The exchange used for sending messages back to the gateway(s).
const GATEWAY_EXCHANGE: string = 'gateway';

// The exchange used for fanning / distributing requests out to the microservices.
const REQUEST_EXCHANGE: string = 'request';

// The topic used for sending get requests to the event details microservice.
const EVENT_DETAILS_SERVICE_TOPIC_GET: string = 'events.details.get';

// The topic used for sending requests to add an event.
// const EVENT_DETAILS_SERVICE_TOPIC_ADD: string = 'events.details.add';

// The topic used for sending modification requests for an event.
// const EVENT_DETAILS_SERVICE_TOPIC_MODIFY: string = 'events.details.modify';

// The topic used for sending event deletion requests.
const EVENT_DETAILS_SERVICE_TOPIC_DELETE: string = 'events.details.delete';

type OutStandingReq = {
    unique_id: Number,
    response: Response,
    callback: Function,
    // TODO: Timestamp.
};

export namespace Gateway {
    type ReadRequestCallback = ((httpRes: Response, reqResponse: ReadRequestResponseMsg, status: Number) => void);
    type RequestCallback = ((httpRes: Response, reqResponse: RequestResponseMsg, status: Number) => void);

    export class GatewayMessageHandler {
        // Connection to the RabbitMQ messaging system.
        conn: Connection;

        // Channel for sending requests out to the backend microservices.
        send_ch: Channel;

        // Channel for receiving responses/results from requests to the backend microservices.
        rcv_ch: Channel;

        // Messages which have been sent on and who's responses are still being waited for.
        outstanding_reqs: Map<Number, OutStandingReq>;

        // Used to validate the structure of the internal messages used as part of uems.
        messageValidator: MessageValidator;

        // Creates a GatewayMessageHandler.
        // Includes creating the channels, exchanges and queues on the connection required.
        //
        // Returns a promise which resolves to the new GatewayMessageHandler.
        static setup(conn: Connection, schemaPath: String): Promise<GatewayMessageHandler> {
            return new Promise(((resolve, reject) => {
                conn.createChannel((err1, sendCh) => {
                    if (err1) {
                        reject(err1);
                    }

                    sendCh.assertExchange(REQUEST_EXCHANGE, 'topic', {
                        durable: false,
                    });
                    conn.createChannel((err2, rcvCh) => {
                        if (err2) {
                            reject(err2);
                        }

                        rcvCh.assertExchange(GATEWAY_EXCHANGE, 'direct');

                        rcvCh.assertQueue(RCV_INBOX_QUEUE_NAME, { exclusive: true }, async (err3, queue) => {
                            if (err3) {
                                reject(err3);
                            }

                            console.log('Binding rcv inbox queue...');

                            rcvCh.bindQueue(RCV_INBOX_QUEUE_NAME, GATEWAY_EXCHANGE, '');

                            const schema = JSON.parse((await fs.readFile(schemaPath)).toString());
                            const mv = new MessageValidator(schema);
                            const mh = new GatewayMessageHandler(conn, sendCh, rcvCh, mv);

                            rcvCh.consume(queue.queue, async (msg) => {
                                if (msg === null) {
                                    console.warn(`${RCV_INBOX_QUEUE_NAME} Null message received. Ignoring...`);
                                    return;
                                }
                                await mh.gatewayInternalMessageReceived(mh, msg);
                            }, { noAck: true });
                            resolve(mh);
                        });
                    });
                });
            }));
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        private constructor(conn: Connection, sendCh: Channel, rcvCh: Channel, messageValidator: MessageValidator) {
            this.conn = conn;
            this.send_ch = sendCh;
            this.rcv_ch = rcvCh;
            this.outstanding_reqs = new Map();
            this.messageValidator = messageValidator;
        }

        // Defines the endpoints for the UEMS gateway external API.
        //
        // Setup as defined in https://xiomi.stoplight.io/docs/uems-gateway-api/reference/kill-me.yaml
        //
        // Args: msgHandler: The message handler which handles the endpoint requests.
        // Return: None
        registerEndpoints(app: Application, auth: PassportStatic, corsOptions: any) {
            // app.post('/events', auth.authenticate('bearer', { session: false }), this.create_event_handler);
            // GET /events
            app.get(
                '/events',
                auth.authenticate('bearer', {
                    session: false,
                }),
                Cors.default(corsOptions),
                this.get_events_handler,
            );

            // // UPDATE
            // app.patch(
            //     '/events',
            //     auth.authenticate('bearer', {
            //         session: false,
            //     }),
            //     Cors.default(corsOptions),
            //     this.update_event_handler,
            // );

            // DELETE /events/{id}
            app.delete(
                '/events/:id',
                auth.authenticate('bearer', {
                    session: false,
                }),
                Cors.default(corsOptions),
                this.delete_event_handler,
            );

            app.get(
                '/',
                (req: Request, res: Response) => res.send('Test Path, Get Req Received'),
            );

            app.get(
                '/status',
                (req: Request, res: Response) => res.send('Ok'),
            );
        }

        // Called whenever a message is received by the gateway from the internal microservices.
        // TODO: This is a potential security weakness point - message parsing -> json injection attacks.
        async gatewayInternalMessageReceived(mh: GatewayMessageHandler, msg: Message) {
            const content = msg.content.toString('utf8');
            const msgJson: ReadRequestResponseMsg | RequestResponseMsg = JSON.parse(content);

            if (!(await this.messageValidator.validate(msgJson))) {
                console.warn('Message with invalid schema received - message dropped');
                return;
            }

            const correspondingReq = mh.outstanding_reqs.get(msgJson.msg_id);
            if (correspondingReq === undefined) {
                console.warn('Request response received with unrecognised or already handled ID, dropped');
                return;
            }

            this.outstanding_reqs.delete(msgJson.msg_id);
            correspondingReq.callback(correspondingReq.response, msgJson);
        }

        publishRequestMessage = async (data: any, key: string) => {
            this.send_ch.publish(REQUEST_EXCHANGE, key, Buffer.from(JSON.stringify(data)));
        };

        // Sends a request to the microservices system and waits for the response to come back.
        sendRequest = async (
            key: string,
            msg: EventMsg,
            res: Response,
            callback: ReadRequestCallback | RequestCallback) => {
            // Create an object which represents a request which has been sent on by the gateway to be handled
            // but is still awaiting a matching response.
            this.outstanding_reqs.set(msg.msg_id, {
                unique_id: msg.msg_id,
                response: res,
                callback,
            });

            const data = msgToJson(msg);
            await this.publishRequestMessage(data, key);
        };

        // create_event_handler = async (req: Request, res: Response) => {
        //     // TODO data validation.
        //     const { name, startDate, endDate, venue } = req.body;
        //     const msg: CreateEventMsg = {
        //         msg_id: this.generateMessageId(),
        //         status: 0, // 0 Code used
        //         msg_intention: MsgIntention.CREATE,
        //         event_name: name,
        //         event_start_date: startDate,
        //         event_end_date: endDate,
        //         venue_ids: [venue],
        //         predicted_attendance: 0,
        //     };

        //     await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_ADD, msg, res);
        // };

        get_events_handler = async (req: Request, res: Response) => {
            const msg: ReadEventMsg = {
                msg_id: this.generateMessageId(),
                status: 0,
                msg_intention: MsgIntention.READ,
            };

            if (req.query.name !== undefined) {
                msg.event_name = req.query.name.toString();
            }

            if (req.query.startbefore !== undefined) {
                msg.event_start_date_range_begin = req.query.startbefore.toString();
            }

            if (req.query.startafter !== undefined) {
                msg.event_start_date_range_end = req.query.startafter.toString();
            }

            if (req.query.endbefore !== undefined) {
                msg.event_end_date_range_begin = req.query.endbefore.toString();
            }

            if (req.query.endafter !== undefined) {
                msg.event_end_date_range_end = req.query.endafter.toString();
            }

            if (req.query.venue !== undefined) {
                msg.venue_ids = [req.query.venue.toString()];
            }

            console.log('Query');
            console.log(req.query);
            console.log('Message');
            console.log(msg);

            const callback: ReadRequestCallback = (
                httpRes: Response<any>,
                reqResponse: ReadRequestResponseMsg,
            ) => {
                if (reqResponse.status === MsgStatus.SUCCESS) {
                    const result: EventResponse[] = reqResponse.result.map(InternalEventToEventResponse);
                    httpRes.status(HttpStatus.OK).send(result);
                } else {
                    console.log(reqResponse);
                    // Note this return code (503) isn't officially defined yet.
                    httpRes.status(HttpStatus.SERVICE_UNAVAILABLE).send({
                        code: '',
                        message: 'Failed to delete event',
                    });
                }
            };

            await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_GET, msg, res, callback);
        };

        // update_event_handler = async (req: Request, res: Response) => {
        //     const { eventId, name, startDate, endDate, venue } = req.body;

        //     const msg: UpdateEventMsg = {
        //         msg_id: this.generateMessageId(),
        //         status: 0,
        //         msg_intention: MsgIntention.UPDATE,
        //         event_id: eventId,
        //     };

        //     if (name !== undefined) {
        //         msg.event_name = name.toString();
        //     }

        //     if (startDate !== undefined) {
        //         msg.event_start_date = startDate;
        //     }

        //     if (endDate !== undefined) {
        //         msg.event_end_date = endDate;
        //     }

        //     if (venue !== undefined) {
        //         msg.venue_ids = [venue.toString()];
        //     }

        //     const callback: RequestCallback = (httpRes: Response<any>, reqResponse: RequestResponseMsg) => {
        //         if (reqResponse.status === MsgStatus.SUCCESS) {
        //             httpRes.status(HttpStatus.NO_CONTENT).send();
        //         } else {
        //             httpRes.status(HttpStatus.NOT_FOUND).send({
        //                 code: '',
        //                 message: 'Failed to delete event',
        //             });
        //         }
        //     };

        //     await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_MODIFY, msg, res, callback);
        // };

        delete_event_handler = async (req: Request, res: Response) => {
            const eventId = req.params.id;

            const msg: DeleteEventMsg = {
                msg_id: this.generateMessageId(),
                status: 0,
                msg_intention: MsgIntention.DELETE,
                event_id: eventId,
            };

            const callback: RequestCallback = (
                httpRes: Response<any>,
                reqResponse: RequestResponseMsg,
                status: Number,
            ) => {
                if (status === MsgStatus.SUCCESS) {
                    httpRes.status(HttpStatus.NO_CONTENT).send();
                } else {
                    httpRes.status(HttpStatus.NOT_FOUND).send({
                        code: '',
                        message: 'Failed to delete event',
                    });
                }
            };

            await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_DELETE, msg, res, callback);
        };

        generateMessageId(): Number {
            const id = Math.random() * 100000;

            if (this.outstanding_reqs.has(id)) { // Performance issue with doing this check for every message.
                return this.generateMessageId();
            }
            return id;
        }
    }
}
