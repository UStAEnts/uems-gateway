import { Request, Response } from 'express';
import { EventMsg, EventRes, EventResponseValidator } from '@uems/uemscommlib';
import { CreateEventResponse, EventResponse, InternalEventToEventResponse } from '../../types/GatewayTypes';
import * as HttpStatus from 'http-status-codes';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { MsgIntention } from '@uems/uemscommlib/build/messaging/types/event_message_schema';
import { GatewayMk2 } from '../../Gateway';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import RequestCallback = GatewayMk2.RequestCallback;
import { EntityResolver } from "../../resolver/EntityResolver";
import { constants } from "http2";

// The topic used for sending get requests to the event details microservice.
const EVENT_DETAILS_SERVICE_TOPIC_GET: string = 'events.details.get';

// The topic used for sending requests to add an event.
const EVENT_DETAILS_SERVICE_TOPIC_CREATE: string = 'events.details.create';

// The topic used for sending modification requests for an event.
const EVENT_DETAILS_SERVICE_TOPIC_UPDATE: string = 'events.details.update';

// The topic used for sending event deletion requests.
const EVENT_DETAILS_SERVICE_TOPIC_DELETE: string = 'events.details.delete';

export class EventGatewayAttachment implements GatewayAttachmentInterface {

    // TODO: bit dangerous using ! - maybe add null checks?
    private _resolver!: EntityResolver;

    async generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
    ): Promise<GatewayInterfaceActionType[]> {
        const validator = await EventResponseValidator.setup();

        this._resolver = resolver;

        return [
            {
                action: 'post',
                path: '/events',
                handle: EventGatewayAttachment.createEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/events',
                handle: this.getEventsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/events/:id',
                handle: this.getEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/events/:id',
                handle: EventGatewayAttachment.updateEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/events/:id',
                handle: EventGatewayAttachment.deleteEventHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private static deleteEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const eventId = req.params.id;

            const msg: EventMsg.DeleteEventMsg = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: EventMsg.MsgIntention.DELETE,
                event_id: eventId,
            };

            const callback: RequestCallback = (
                httpRes,
                timestamp,
                response,
                status,
            ) => {
                // This is validated by the handler function
                const reqResponse = response as EventRes.RequestResponseMsg;

                // Mark this message ID as used so it can be reallocated to another request
                MessageUtilities.identifierConsumed(reqResponse.msg_id as number);

                if (status === EventRes.MsgStatus.SUCCESS) {
                    httpRes.status(HttpStatus.NO_CONTENT)
                        .send();
                } else {
                    httpRes.status(HttpStatus.NOT_FOUND)
                        .json(ErrorCodes.FAILED);
                }
            };

            // @ts-ignore - number/Number
            await send(EVENT_DETAILS_SERVICE_TOPIC_DELETE, msg, res, callback);
        };
    }

    private static updateEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const eventId = req.params.id;

            const msg: EventMsg.UpdateEventMsg = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: EventMsg.MsgIntention.UPDATE,
                event_id: eventId,
            };

            const {
                name,
                startDate,
                endDate
            } = req.body;

            if (name !== undefined) {
                msg.event_name = name.toString();
            }

            if (startDate !== undefined) {
                msg.event_start_date = startDate;
            }

            if (endDate !== undefined) {
                msg.event_end_date = endDate;
            }

            const callback: RequestCallback = (
                httpRes,
                timestamp,
                response,
                status,
            ) => {
                // This is validated by the handler function
                const reqResponse = response as EventRes.RequestResponseMsg;

                MessageUtilities.identifierConsumed(reqResponse.msg_id as number);
                if (status === EventRes.MsgStatus.SUCCESS) {
                    httpRes.status(HttpStatus.OK)
                        .send({
                            status: 'OK',
                            result: {
                                id: reqResponse.result[0],
                                name: '',
                                startDate: 0,
                                endDate: 0,
                            },
                        });
                } else {
                    httpRes.status(HttpStatus.NOT_FOUND)
                        .send(ErrorCodes.FAILED);
                }
            };

            // @ts-ignore - Number/number
            await send(EVENT_DETAILS_SERVICE_TOPIC_UPDATE, msg, res, callback);
        };
    }

    private getEventsHandler = (send: SendRequestFunction) => {
        return async (req: Request, res: Response) => {
            const msg: EventMsg.ReadEventMsg = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: EventMsg.MsgIntention.READ,
            };

            if (req.query.name !== undefined) {
                msg.event_name = req.query.name.toString();
            }

            if (req.query.startbefore !== undefined) {
                msg.event_start_date_range_begin = parseInt(req.query.startbefore.toString(), 10);
            }

            if (req.query.startafter !== undefined) {
                msg.event_start_date_range_end = parseInt(req.query.startafter.toString(), 10);
            }

            if (req.query.endbefore !== undefined) {
                msg.event_end_date_range_begin = parseInt(req.query.endbefore.toString(), 10);
            }

            if (req.query.endafter !== undefined) {
                msg.event_end_date_range_end = parseInt(req.query.endafter.toString(), 10);
            }

            if (req.query.venue !== undefined) {
                msg.venue_ids = [req.query.venue.toString()];
            }

            const callback: RequestCallback = (
                httpRes,
                timestamp,
                response,
                status,
            ) => {
                // This is validated by the handler function
                const reqResponse = response as EventRes.ReadRequestResponseMsg;

                MessageUtilities.identifierConsumed(reqResponse.msg_id as number);
                if (status === EventRes.MsgStatus.SUCCESS) {
                    const result: EventResponse[] = reqResponse.result.map(InternalEventToEventResponse);
                    // Now we need to map it twice, not ideal but oh well, TODO: come up with a better way to do this?
                    this._resolver.resolveEntStateSet(result)
                        .then(() => this._resolver.resolveStateSet(result))
                        .then(() => this._resolver.resolveVenueSet(result))
                        .then(() => {
                            httpRes.status(HttpStatus.OK)
                                .send({
                                    status: 'OK',
                                    result,
                                });
                        });
                } else {
                    console.log(reqResponse);
                    // Note this return code (503) isn't officially defined yet.
                    httpRes.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .send(ErrorCodes.FAILED);
                }
            };

            // @ts-ignore - Number not number
            await send(EVENT_DETAILS_SERVICE_TOPIC_GET, msg, res, callback);
        };
    }

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MsgIntention.READ,
                status: 0,
            };

            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const callback: RequestCallback = (
                httpRes,
                timestamp,
                response,
                status,
            ) => {
                // This is validated by the handler function
                const reqResponse = response as EventRes.ReadRequestResponseMsg;

                MessageUtilities.identifierConsumed(reqResponse.msg_id as number);
                if (status === EventRes.MsgStatus.SUCCESS) {
                    const result: EventResponse[] = reqResponse.result.map(InternalEventToEventResponse);
                    console.log(result);
                    if (result.length !== 1){
                        httpRes.status(HttpStatus.NOT_FOUND)
                            .send(ErrorCodes.FAILED);
                        return;
                    }
                    // Now we need to map it twice, not ideal but oh well, TODO: come up with a better way to do this?
                    this._resolver.resolveEntStateSet(result)
                        .then(() => this._resolver.resolveStateSet(result))
                        .then(() => this._resolver.resolveVenueSet(result))
                        .then(() => {
                            httpRes.status(HttpStatus.OK)
                                .send({
                                    status: 'OK',
                                    result: {
                                        event: result[0],
                                        changelog: [],
                                    },
                                });
                        });
                } else {
                    console.log(reqResponse);
                    // Note this return code (503) isn't officially defined yet.
                    httpRes.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .send(ErrorCodes.FAILED);
                }
            };

            outgoingMessage.event_id = req.params.id;

            console.log(outgoingMessage);

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_GET,
                outgoingMessage,
                res,
                callback,
            );
        };
    }

    private static createEventHandler(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const {
                name,
                startDate,
                endDate
            } = request.body;
            const msg: EventMsg.CreateEventMsg = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0, // 0 Code used when the status is still to be decided.
                msg_intention: MsgIntention.CREATE,
                event_name: name,
                event_start_date: startDate,
                event_end_date: endDate,
                venue_ids: [''], // Placeholder as venue assignment not in API yet.
                predicted_attendance: 0, // Placeholder.
            };

            const callback: RequestCallback = (
                httpRes,
                timestamp,
                response,
                status,
            ) => {
                // This is validated by the handler function
                const reqResponse = response as EventRes.RequestResponseMsg;

                MessageUtilities.identifierConsumed(reqResponse.msg_id as number);
                if (status === EventRes.MsgStatus.SUCCESS) {
                    // TODO: the fuck?
                    const result: CreateEventResponse = {
                        status: 'OK',
                        result: {
                            id: reqResponse.result[0],
                            name: '',
                            startDate: 0,
                            endDate: 0,
                            attendance: 0,
                        },
                    };
                    httpRes.status(HttpStatus.CREATED)
                        .send(result);
                } else {
                    // Note this return code (503) isn't officially defined yet.
                    httpRes.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .send(ErrorCodes.FAILED);
                }
            };

            // @ts-ignore - why are we using Number?
            await send(EVENT_DETAILS_SERVICE_TOPIC_CREATE, msg, res, callback);
        };
    }
}
