// Handles receiving a HTTP REST request and processing that into a message
// to be sent onto a microservice.

import { Channel, Connection, Message, Replies } from 'amqplib/callback_api';
import { Response, Request, NextFunction } from 'express';
import AssertQueue = Replies.AssertQueue;

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

export class GatewayMessageHandler {
    // Connection to the RabbitMQ messaging system.
    conn: Connection;

    // Channel for sending messages out to the microservices and receiving them back as a response.
    send_ch: Channel;

    rcv_ch: Channel;

    // Messages which have been sent on and who's responses are still being waited for.
    outstanding_reqs: Map<Number, OutStandingReq>;

    // Creates a GatewayMessageHandler.
    // Includes creating the channels, exchanges and queues on the connection required.
    //
    // Returns a promise which resolves to the new GatewayMessageHandler.
    static setup(conn: Connection): Promise<GatewayMessageHandler> {
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

                    rcvCh.assertQueue(RCV_INBOX_QUEUE_NAME, { exclusive: true }, (err3, queue) => {
                        if (err3) {
                            reject(err3);
                        }

                        console.log('Binding rcv inbox queue...');

                        rcvCh.bindQueue(RCV_INBOX_QUEUE_NAME, GATEWAY_EXCHANGE, '');

                        const mh = new GatewayMessageHandler(conn, sendCh, rcvCh, queue);

                        rcvCh.consume(queue.queue, (msg) => {
                            if (msg === null) {
                                console.warn(`${RCV_INBOX_QUEUE_NAME} consumed a message that was NULL. Ignoring...`);
                                return;
                            }

                            mh.gatewayInternalMessageReceived(mh, msg);
                        }, { noAck: true });

                        resolve(mh);
                    });
                });
            });
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private constructor(conn: Connection, sendCh: Channel, rcvCh: Channel, rcvQueue: AssertQueue) {
        this.conn = conn;
        this.send_ch = sendCh;
        this.rcv_ch = rcvCh;
        this.outstanding_reqs = new Map();
    }

    // Called whenever a message is received by the gateway from the internal microservices.
    gatewayInternalMessageReceived(mh: GatewayMessageHandler, msg: Message) {
        const content = msg.content.toString('utf8');
        // TODO: This is a potential security weakness point - message parsing -> json injection attacks.

        // TODO: checks for message integrity.
        const msgJson = JSON.parse(content);

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
    sendRequest = async (key: string, data: any, dataID: Number, res: Response) => {
        // Create an object which represents a request which has been sent on by the gateway to be handled
        // but is still awaiting a matching response.
        this.outstanding_reqs.set(dataID, {
            unique_id: dataID,
            response: res,
            callback(response: Response, responseJSON: string) {
                response.send(responseJSON);
            },
        });

        await this.publishRequestMessage(data, key);
    };

    add_events_handler = async (req: Request, res: Response, next: NextFunction) => {
        const addMessage = parseAddEventRequestToMessage(req, this.generateMessageId());
        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_ADD, addMessage, addMessage.ID, res);
    }

    get_events_handler = async (req: Request, res: Response) => {
        const reqMessage = parseGetEventRequestToMessage(req, this.generateMessageId());
        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_GET, reqMessage, reqMessage.ID, res);
    };

    modify_events_handler = async (req: Request, res: Response, next: NextFunction) => {
        const modifyMessage = parseModifyEventMessage(req, this.generateMessageId());
        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_MODIFY, modifyMessage, modifyMessage.ID, res);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    remove_events_handler = async (req: Request, res: Response, next: NextFunction) => {
        const deleteMessage = parseDeleteEventMessage(req, this.generateMessageId());
        await this.sendRequest(EVENT_DETAILS_SERVICE_TOPIC_DELETE, deleteMessage, deleteMessage.ID, res);
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

function parseGetEventRequestToMessage(req: Request,  msgID: Number) {
    return {
        "ID": msgID,
        "type": "query",
        "name": (req.query.name === undefined) ? "" : req.query.name,
        "start_date_before": (req.query.start_before === undefined) ? "" : req.query.start_before,
        "start_date_after": (req.query.start_after === undefined) ? "" : req.query.start_after,
        "end_date_before": (req.query.end_before === undefined) ? "" : req.query.end_before,
        "end_date_after": (req.query.end_after === undefined) ? "" : req.query.end_after,
        "venue": (req.query.venue === undefined) ? "" : req.query.venue
    };
}

function parseAddEventRequestToMessage(req: Request, msgID: Number) {
    // TODO, rejection on malformed request.

    const name = req.body.name;
    const start_date = req.body.start_date;
    const end_date = req.body.end_date;
    const venue = req.body.venue;

    return {
        "ID": msgID,
        "type": "add",
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "venue": venue,
    }
}

function parseModifyEventMessage(req: Request, msgID: Number) {
    const eventId = req.body.event_id;
    const name = req.body.name;
    const start_date = req.body.start_date;
    const end_date = req.body.end_date;
    const venue = req.body.venue;

    return {
        "ID": msgID,
        "event_id": eventId,
        "type": "modify",
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "venue": venue,
    }
}

function parseDeleteEventMessage(req: Request, msgID: Number) {
    const eventId = req.body.event_id;
    return {
        "ID": msgID,
        "type": "delete",
        event_id: eventId
    }
}

exports.GatewayMessageHandler = GatewayMessageHandler;
