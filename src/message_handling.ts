// Handles receiving a HTTP REST request and processing that into a message
// to be sent onto a microservice.

import { Channel, Connection, Message, Replies } from 'amqplib/callback_api';
import { Response, Request, NextFunction } from 'express';
import AssertQueue = Replies.AssertQueue;
import Ajv from 'ajv';
import {CreateEventMsg, ReadEventMsg, UpdateEventMsg, DeleteEventMsg, EventMsg, MsgIntention, msgToJson} from './schema/types/event_message_schema';

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
const EVENT_DETAILS_SERVICE_TOPIC_ADD: string = 'events.details.add';

// The topic used for sending modification requests for an event.
const EVENT_DETAILS_SERVICE_TOPIC_MODIFY: string = 'events.details.modify';

// The topic used for sending event deletion requests.
const EVENT_DETAILS_SERVICE_TOPIC_DELETE: string = 'events.details.delete';

type OutStandingReq = {
    unique_id: Number,
    response: Response,
    callback: Function,
    // TODO: Timestamp.
};

export class MessageValidator {
    schema_validator: Ajv.ValidateFunction;

    constructor(schema: object) {
        let ajv = new Ajv({allErrors: true});
        this.schema_validator = ajv.compile(schema);
    }

    public async validate(msg: any): Promise<boolean> {
        return await this.schema_validator(msg);
    }
}

export class GatewayMessageHandler {
    // Connection to the RabbitMQ messaging system.
    conn: Connection;

    // Channels for sending messages out to the microservices and receiving them back as a response.
    send_ch: Channel;
    rcv_ch: Channel;

    // Messages which have been sent on and who's responses are still being waited for.
    outstanding_reqs: Map<Number, OutStandingReq>;

    // The message schema validator used to validate the structure of the json internal messages used as part of uems.
    message_validator: MessageValidator;

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

                        let schema = JSON.parse((await fs.readFile(schemaPath)).toString());
                        let mv = new MessageValidator(schema);

                        const mh = new GatewayMessageHandler(conn, sendCh, rcvCh, queue, mv);

                        rcvCh.consume(queue.queue, async (msg) => {
                            if (msg === null) {
                                console.warn(`${RCV_INBOX_QUEUE_NAME} consumed a message that was NULL. Ignoring...`);
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
    private constructor(conn: Connection, sendCh: Channel, rcvCh: Channel, rcvQueue: AssertQueue, message_validator: MessageValidator) {
        this.conn = conn;
        this.send_ch = sendCh;
        this.rcv_ch = rcvCh;
        this.outstanding_reqs = new Map();
        this.message_validator = message_validator;
    }

    // Called whenever a message is received by the gateway from the internal microservices.
    // TODO: This is a potential security weakness point - message parsing -> json injection attacks.
    async gatewayInternalMessageReceived(mh: GatewayMessageHandler, msg: Message) {
        const content = msg.content.toString('utf8');
        const msgJson = JSON.parse(content);

        console.log("Message received:");
        console.log(msgJson);

        if (! (await this.message_validator.validate(msgJson))) {
            console.log("Message with invalid schema received - message dropped");
            console.log(this.message_validator.schema_validator.errors);
            return;
        }

        console.log("Message passed validation");

        const correspondingReq = mh.outstanding_reqs.get(msgJson.ID);
        if (correspondingReq === undefined) {
            console.log('Request response received with unrecognised or already handled ID');
            return;
        }

        this.outstanding_reqs.delete(msgJson.ID);

        correspondingReq.callback(correspondingReq.response, msgJson.payload);
    }

    publishRequestMessage = async (data: any, key: string) => {
        this.send_ch.publish(REQUEST_EXCHANGE, key, Buffer.from(JSON.stringify(data)));
    };

    // Sends a request to the microservices system and waits for the response to come back.
    sendRequest = async (key: string, msg: EventMsg, res: Response) => {
        // Create an object which represents a request which has been sent on by the gateway to be handled
        // but is still awaiting a matching response.
        this.outstanding_reqs.set(msg.msg_id, {
            unique_id: msg.msg_id,
            response: res,
            callback(response: Response, responseJSON: string) {
                response.send(responseJSON);
            },
        });

        let data = msgToJson(msg);

        await this.publishRequestMessage(data, key);
    };

    create_event_handler = async (req: Request, res: Response, next: NextFunction) => {
        // TODO data validation.
        const name = req.body.name;
        const start_date = req.body.start_date;
        const end_date = req.body.end_date;
        const venue = req.body.venue;

        let msg: CreateEventMsg = {
            msg_id: this.generateMessageId(),
            status: 0, // 0 Code used 
            msg_intention: MsgIntention.CREATE,
            event_name: name,
            event_start_date: start_date,
            event_end_date: end_date,
            venue_ids: [venue],
            predicted_attendance: 0,
        };

        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_ADD, msg, res);
    }

    read_event_handler = async (req: Request, res: Response) => {
        let msg: ReadEventMsg = {
            msg_id: this.generateMessageId(),
            status: 0,
            msg_intention: MsgIntention.READ
        };

        if (req.query.name !== undefined) {
            msg.event_name = req.query.name.toString();
        }

        if (req.query.start_before !== undefined) {
            msg.event_start_date_range_begin = req.query.start_before.toString();
        }
        
        if (req.query.start_after !== undefined) {
            msg.event_start_date_range_end = req.query.start_after.toString();
        }

        if (req.query.end_before !== undefined) {
            msg.event_end_date_range_begin = req.query.end_before.toString();
        }

        if (req.query.end_after !== undefined) {
            msg.event_end_date_range_end = req.query.end_after.toString();
        }

        if (req.query.venue !== undefined) {
            msg.venue_ids = [req.query.venue.toString()];
        }

        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_GET, msg, res);
    };

    update_event_handler = async (req: Request, res: Response, next: NextFunction) => {
        const eventId = req.body.event_id;
        const name = req.body.name;
        const start_date = req.body.start_date;
        const end_date = req.body.end_date;
        const venue = req.body.venue;

        let msg: UpdateEventMsg = {
            msg_id: this.generateMessageId(),
            status: 0,
            msg_intention: MsgIntention.UPDATE,
            event_id: eventId
        }

        if (name !== undefined) {
            msg.event_name = name.toString();
        }

        if (start_date !== undefined) {
            msg.event_start_date = start_date;
        }

        if (end_date !== undefined) {
            msg.event_end_date = end_date;
        }

        if (venue !== undefined) {
            msg.venue_ids = [venue.toString()];
        }

        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_MODIFY, msg, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    delete_event_handler = async (req: Request, res: Response, next: NextFunction) => {
        const eventId = req.body.event_id;

        let msg: DeleteEventMsg = {
            msg_id: this.generateMessageId(),
            status: 0,
            msg_intention: MsgIntention.DELETE,
            event_id: eventId
        }

        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_DELETE, msg, res);
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        console.log('Closing GatewayMessageHandler...');
    }

    generateMessageId(): Number {
        // TODO, evaluate the issues with using this mechanism
        // This is a security issue, two messages may be assigned the same ID (if there are multiple gateways) and therefore a request by 
        // one client might be routed back to another client thereby leaking data.
        let id = Math.random() * 100000;

        if (this.outstanding_reqs.has(id)) {
            return this.generateMessageId();
        } else {
            return id;
        }
    }
}

exports.GatewayMessageHandler = GatewayMessageHandler;
