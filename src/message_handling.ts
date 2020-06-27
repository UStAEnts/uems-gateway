import {Channel, connect as amqpConnect, Connection, ConsumeMessage} from "amqplib/callback_api";
import { send } from "process";

// Handles receiving a HTTP REST request and processing that into a message 
// to be sent onto a microservice.

const EVENT_REQ_QUEUE_NAME: string = "eventReq";

// The queue of messages being sent from the microservices back to the gateway.
const RCV_INBOX_QUEUE_NAME: string = "inbox";

// The exchange used for sending messages back to the gateway(s).
const GATEWAY_EXCHANGE: string = "gateway";

// The exchange used for fanning / distributing requests out to the microservices.
const REQUEST_EXCHANGE: string = "request";

let send_ch = null;

type OutStandingReq = {
    unique_id: Number,
    response: Response,
    callback: Function,
    // TODO: Timestamp.
}

class GatewayMessageHandler {
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
    static setup(conn: Connection) {
        return new Promise(function (resolve, reject) {
            conn.createChannel(function (err1, send_ch) {
                if (err1) {
                    reject(err1);
                }
    
                send_ch.assertExchange(REQUEST_EXCHANGE, 'fanout', {
                    durable: false
                });
                conn.createChannel(function (err2, rcv_ch) {
                    if (err2) {
                        reject(err2);
                    }
        
                    rcv_ch.assertExchange(GATEWAY_EXCHANGE, 'direct');
        
                    rcv_ch.assertQueue(RCV_INBOX_QUEUE_NAME, {exclusive:true}, function (err3, queue) {
                        if (err3) {
                            reject(err3);
                        }

                        console.log("Binding rcv inbox queue...");

                        rcv_ch.bindQueue(RCV_INBOX_QUEUE_NAME, GATEWAY_EXCHANGE, '');

                        resolve(new GatewayMessageHandler(conn, send_ch, rcv_ch, queue));
                    });
                });
            });
        });
    }

    private constructor(conn: Connection, send_ch: Channel, rcv_ch: Channel, rcv_queue) {
        this.conn = conn;
        this.send_ch = send_ch;
        this.rcv_ch = rcv_ch;
    
        rcv_ch.consume(rcv_queue.queue, this.gatewayInternalMessageReceived, {noAck: true});
    }
    

    gatewayInternalMessageReceived(msg) {
        // TODO: This is a potential security weakness point - message parsing -> json injection attacks.

        console.log("Internal message received");
        const msg_json = JSON.parse(msg.content);

        const correspondingReq = this.outstanding_reqs.get(msg_json.ID);
        if (correspondingReq == undefined) {
            console.log("Request response received with unrecognised or already handled ID");
            return;
        }

        this.outstanding_reqs.delete(msg_json.ID);

        correspondingReq.callback(correspondingReq.response, msg_json);
    }

    publishRequestMessage = async (data) => {
        await this.send_ch.publish(REQUEST_EXCHANGE, '', Buffer.from(JSON.stringify(data)));
    }

    // Sends a request to the microservices system and waits for the response to come back. 
    sendRequest = async (data, data_id: Number, res: Response) => {

        // Create an object which represents a request which has been sent on by the gateway to be handled 
        // but is still awaiting a matching response.
        this.outstanding_reqs.set(data_id, {
            unique_id: data_id,
            response: res,
            callback: function (res, response_json) {
                res.send(response_json);
            }
        });

        await this.publishRequestMessage(data);
    }

    add_events_handler(req, res, next) {
        throw new Error('Unimplemented');
    }
    
    get_events_handler = async (req, res, next) => {
        const req_message = parse_get_event_req_to_message(req);

        console.log("Get event request received");

        await this.sendRequest(req_message, req_message.ID, res);
    }
    
    modify_events_handler(req, res, next) {
        throw new Error('Unimplemented');
    }
    
    remove_events_handler(req, res, next) {
        throw new Error('Unimplemented');
    }

    close() {
        console.log("Closing GatewayMessageHandler...");
    }
}

function parse_get_event_req_to_message(req) {
    // TODO, currently returns blank - 'get all' type message.
    let msg = {
        "ID": Math.random() * 100000,
        "name": "",
        "start_date_before": "",
        "start_date_after": "",
        "end_date_before": "",
        "end_date_after": "",
    };
    return msg;
}

exports.GatewayMessageHandler = GatewayMessageHandler;