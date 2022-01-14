// This relies on a single identifier for a request that need to be passed around the system.
import { util } from "zod/lib/src/helpers/util";
import Omit = util.Omit;
import { number } from "zod";
import { inspect } from "util";
import { info } from "winston";

/**
 * This is a simple type alias used to ensure that code is readable and can be upgraded at a later date
 */
export type LogIdentifier = string;

/**
 * Defines a message sent to/from a microservice to/from a gateway with some additional properties
 */
type Message = {
    /**
     * If the message has leaving the gateway or coming into the gateway
     */
    direction: 'incoming' | 'outgoing',
    /**
     * The origin service if known
     */
    origin: string,
    /**
     * The destination service if known
     */
    destination: string,
    /**
     * The routing key if one was specified in the request
     */
    routingKey?: string,
    /**
     * The content of the message, it has to be a well formed message which is used to match the incoming and outgoing
     */
    content: {
        msg_id: number,
    } & Record<any, any>,
    /**
     * The time at which the message was received
     */
    timestamp: number,
}
/**
 * A log record for a single request
 */
type RequestLog = {
    /**
     * The identifier of the request which should match {@link Request#requestID}
     */
    identifier: LogIdentifier,
    /**
     * The status of the request once it has been completed
     */
    status: number,
    /**
     * The messages sent from and from microservices in the course of this request
     */
    messages: {
        /**
         * Messages transmitted from the gateway to another service
         */
        transmitted: Message[],
        /**
         * Messages received from the other services
         */
        received: Message[],
    },
    /**
     * General information logging messages for a request
     */
    info: {
        /**
         * The source of the message within the system
         */
        source: string,
        /**
         * The message logged by the source
         */
        message: string,
        /**
         * The timestamp at which the message was logged
         */
        timestamp: number
    }[],
    /**
     * The json response sent to the client
     */
    json: any,
}

/**
 * A partial log object where the identifier, messages and info are required and the rest are optional
 */
type PartialLog =
    Partial<Omit<RequestLog, 'identifier' | 'messages' | 'info'>>
    & Pick<RequestLog, 'identifier' | 'messages' | 'info'>;

/**
 * The cache of request logs
 */
const requestCache: Record<LogIdentifier, PartialLog> = {};

/**
 * Prepopulates the request cache with the emptiest possible log that meets the typing requirements
 * @param id the id to insert into the cache
 */
function prepopulate(id: LogIdentifier) {
    if (Object.prototype.hasOwnProperty.call(requestCache, id)) return;

    requestCache[id] = {
        identifier: id,
        messages: {
            transmitted: [] as Message[],
            received: [] as Message[],
        },
        info: [],
    }
}

/**
 * Logs an outgoing message linked with this request
 * @param id the identifier of the request
 * @param destination the target of the message if known
 * @param routingKey the routing key the messag was sent with
 * @param content the content of the message
 */
export function logOutgoing(id: LogIdentifier, destination: string, routingKey: string, content: Message['content']) {
    prepopulate(id);

    requestCache[id].messages.transmitted.push({
        routingKey,
        content,
        destination,
        origin: 'gateway',
        direction: 'outgoing',
        timestamp: Date.now(),
    });
}

/**
 * Logs a message received from a service as part of a request taking place
 * @param id the id of the request
 * @param origin the origin of the message if known
 * @param content the content of the message
 * @param routingKey the optional routing key
 */
export function logIncoming(id: LogIdentifier, origin: string, content: Message['content'], routingKey?: string) {
    prepopulate(id);

    requestCache[id].messages.received.push({
        content,
        origin,
        routingKey,
        direction: 'incoming',
        destination: 'gateway',
        timestamp: Date.now(),
    });
}

/**
 * Returns the calling function through to levels of abstraction. This will return the function calling the
 * function calling this function or unknown if not found
 */
function getSourceFile(): string {
    const stack = new Error().stack;
    if (stack === undefined) return 'unknown';

    const lines = stack.split('\n');
    if (lines.length <= 3) return 'unknown';

    // 0: Error
    // 1:  at RequestLogger.getSourceFile
    // 2:  at RequestLogger.logInfo
    // 3:  ...
    return stack.split('\n')[3].trim()
        .substring(3);
}

/**
 * Logs an informational message
 * @param id the id of the request to which this relates
 * @param message the message to log
 * @param source the source of the message being sent, if not specified this will use {@link getSourceFile}
 */
export function logInfo(id: LogIdentifier, message: string, source?: string) {
    prepopulate(id);

    requestCache[id].info.push({
        source: source ?? getSourceFile(),
        message,
        timestamp: Date.now(),
    })
}

/**
 * Logs the resolution of a request including the status code and any sent information
 * @param id the id of the request
 * @param status the status of the request
 * @param content the content sent to the client
 */
export function logResolve(id: LogIdentifier, status: number, content: any) {
    prepopulate(id);
    requestCache[id].status = status;
    requestCache[id].json = content;

    if (status < 200 || status > 299) {
        console.log(`\u001b[${31}mRequest logged due to non-200 response code\u001b[${39}m`)
        formatAndPrintLog(id);
    }

    delete requestCache[id];
}

/**
 * Formats and prints a log chain, ordered by time with coloured formatting etc
 * @param id the id of the request to log
 */
export function formatAndPrintLog(id: LogIdentifier) {
    prepopulate(id);
    const unknownMessages: Message[] = [];
    const groupedMessages: { service: string, id: number, incoming: Message, outgoing: Message, timestamp: number }[] = [];

    requestCache[id].messages.transmitted.forEach((message) => {
        const identifier = message.content.msg_id;
        const service = message.destination;

        const matching = requestCache[id].messages.received.find((e) => e.content.msg_id === identifier);
        if (matching) {
            groupedMessages.push({
                service,
                id: identifier,
                incoming: matching,
                outgoing: message,
                timestamp: message.timestamp,
            });
        } else {
            unknownMessages.push(message);
        }
    });
    requestCache[id].messages.received.forEach((message) => {
        if (!groupedMessages.find((e) => e.id === message.content.msg_id)) {
            unknownMessages.push(message);
        }
    });

    // Every message should now be in unknown or grouped
    // Now we need to combine all log types into one array which can be sorted
    const sortable: (Record<any, any> & { timestamp: number })[] = [];

    sortable.push(...groupedMessages);
    sortable.push(...unknownMessages);
    sortable.push(...requestCache[id].info);
    sortable.sort((a, b) => a.timestamp - b.timestamp);

    // Then we convert to stages
    // Formats
    // info
    //     [timestamp]: message
    // unknown message
    //     [timestamp]: <origin> ---| <routingkey> |---> <destination>
    //          message
    // grouped message
    //     [timestamp]:
    //         <origin> ---| <routingkey> |---> <destination>
    //             message
    //             @ timestamp
    //         <origin> ---| <routingkey> |---> <destination>
    //             message
    //             @ timestamp
    // final entry:
    //    resulting status: status
    //    returned content:
    //       message

    const rd = `\u001b[${31}m░░ \u001b[${39}m`;
    const time = (timestamp: number) => new Date(timestamp).toISOString();

    const formatAndIndent = (obj: any, level: number = 1) => inspect(obj, true, null, true)
        .split('\n')
        .map((e) => rd + '\t'.repeat(level) + e)
        .join('\n');
    const infoToMessage = (info: RequestLog['info'][number]) => `${rd}[${time(info.timestamp)}]: ${info.source}\n${rd}\t${info.message}`;
    const unknownMessageToMessage = (message: Message) => `${rd}[${time(message.timestamp)}] ${message.origin} ---| ${message.routingKey} |---> ${message.destination}\n${rd}${formatAndIndent(message.content)}`;
    const groupedMessageToMessage = (messages: (typeof groupedMessages)[number]) => `${rd}[${time(messages.timestamp)}]\n${rd}\t${messages.outgoing.origin} ---| ${messages.outgoing.routingKey} |---> ${messages.outgoing.destination}\n${formatAndIndent(messages.outgoing.content, 2)}\n${rd}\t\t${time(messages.outgoing.timestamp)}\n${rd}\t${messages.incoming.origin} ---| ${messages.incoming.routingKey} |---> ${messages.incoming.destination}\n${formatAndIndent(messages.incoming.content, 2)}\n${rd}\t\t${time(messages.outgoing.timestamp)}`

    sortable.forEach((e) => {
        if (e.source) {
            console.log(infoToMessage(e as any));
        } else if (e.outgoing) {
            console.log(groupedMessageToMessage(e as any));
        } else {
            console.log(unknownMessageToMessage(e as any));
        }
    });

    console.log(`${rd}——————————`);
    console.log(`${rd} resulting status: ${requestCache[id].status}`);
    console.log(`${rd} returned content: ${inspect(requestCache[id].json, true, null, true)
        .split('\n')
        .map((e) => `${rd}\t${e}`)
        .join('\n')}`);
    console.log(`${rd}——————————`);

}