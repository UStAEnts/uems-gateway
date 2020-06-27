import {Channel, connect as amqpConnect, Connection, ConsumeMessage} from "amqplib";

// Handles receiving a HTTP REST request and processing that into a message 
// to be sent onto a microservice.

const EVENT_REQ_QUEUE_NAME = "eventReq";

let details_ch = null;

class GatewayMessageHandler {
    // Connection to the RabbitMQ messaging system.
    conn: Connection;

    constructor(conn) {
        this.conn = conn;

        conn.createChannel(function (err, channel) {
            details_ch = channel;
        });
    }

    publishMessage = async (queueName, data) => {
        details_ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
    }

    add_events_handler(req, res, next) {
        throw new Error('Unimplemented');
    }
    
    get_events_handler = async (req, res, next) => {
        const req_message = parse_get_event_req_to_message(req);

        console.log("Get event request received");

        await this.publishMessage(EVENT_REQ_QUEUE_NAME, req_message);
    
        return res.send("Get event handler req received")
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
        "name": "",
        "start_date_before": "",
        "start_date_after": "",
        "end_date_before": "",
        "end_date_after": "",
    };
    return msg;
}

function create(amqp_conn) {
    return new GatewayMessageHandler(amqp_conn);
}

exports.create = create;