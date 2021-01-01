import { Request, Response } from 'express';
import { EventMessage, EventResponse, EventResponseValidator, MessageIntention } from '@uems/uemscommlib';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { GatewayMk2 } from '../../Gateway';
import { EntityResolver } from '../../resolver/EntityResolver';
import { constants } from 'http2';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import DeleteEventMessage = EventMessage.DeleteEventMessage;
import UpdateEventMessage = EventMessage.UpdateEventMessage;
import ReadEventMessage = EventMessage.ReadEventMessage;
import CreateEventMessage = EventMessage.CreateEventMessage;
import EventReadResponseMessage = EventResponse.EventReadResponseMessage;

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

    private readonly DEPENDENCY_TRANSFORMER: GenericHandlerFunctions.Transformer<EventReadResponseMessage> = async (data) => {
        await Promise.all([
            this._resolver.resolveEntStateSet(data),
            this._resolver.resolveStateSet(data),
            this._resolver.resolveVenueSet(data),
        ]);
        return data;
    };

    private static deleteEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const eventId = req.params.id;

            const msg: DeleteEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'DELETE',
                id: eventId,
            };

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_DELETE,
                msg,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private static updateEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const eventId = req.params.id;

            const msg: UpdateEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'UPDATE',
                id: eventId,
            };

            const {
                name,
                startDate,
                endDate,
            } = req.body;

            if (name !== undefined) {
                msg.name = name.toString();
            }

            if (startDate !== undefined) {
                msg.start = startDate;
            }

            if (endDate !== undefined) {
                msg.end = endDate;
            }

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_UPDATE,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventsHandler = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
        };

        if (req.query.name !== undefined) {
            msg.name = req.query.name.toString();
        }

        if (req.query.start !== undefined) {
            msg.start = parseInt(req.query.start.toString(), 10);
        }

        if (req.query.end !== undefined) {
            msg.end = parseInt(req.query.end.toString(), 10);
        }

        if (req.query.attendance !== undefined) {
            msg.attendance = parseInt(req.query.attendance.toString(), 10);
        }

        if (req.query.venueIDs !== undefined && typeof (req.query.venueIDs) === 'string') {
            if (req.query.venueCriteria !== undefined) {
                if (req.query.venueCriteria === 'all') {
                    msg.allVenues = req.query.venueIDs.split(',');
                } else if (req.query.venueCriteria === 'any') {
                    msg.anyVenues = req.query.venueIDs.split(',');
                }
            } else {
                msg.venueIDs = req.query.venueIDs.split(',');
            }
        }

        if (req.query.entsID !== undefined && typeof (req.query.entsID) === 'string') {
            msg.entsID = req.query.entsID;
        }

        if (req.query.stateID !== undefined && typeof (req.query.stateID) === 'string') {
            msg.stateID = req.query.stateID;
        }

        if (req.query.startafter !== undefined) {
            msg.startRangeBegin = parseInt(req.query.startafter.toString(), 10);
        }

        if (req.query.startbefore !== undefined) {
            msg.startRangeEnd = parseInt(req.query.startbefore.toString(), 10);
        }

        if (req.query.endafter !== undefined) {
            msg.endRangeBegin = parseInt(req.query.endafter.toString(), 10);
        }

        if (req.query.endbefore !== undefined) {
            msg.endRangeEnd = parseInt(req.query.endbefore.toString(), 10);
        }

        if (req.query.attendanceGreater !== undefined) {
            msg.attendanceRangeBegin = parseInt(req.query.attendanceGreater.toString(), 10);
        }

        if (req.query.attendanceLess !== undefined) {
            msg.attendanceRangeEnd = parseInt(req.query.attendanceLess.toString(), 10);
        }

        await send(
            EVENT_DETAILS_SERVICE_TOPIC_GET,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(
                this.DEPENDENCY_TRANSFORMER,
            ),
        );
    };

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.READ,
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

            outgoingMessage.event_id = req.params.id;

            console.log(outgoingMessage);

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_GET,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(
                    this.DEPENDENCY_TRANSFORMER,
                ),
            );
        };
    }

    private static createEventHandler(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const {
                name,
                startDate,
                endDate,
            } = request.body;
            const msg: CreateEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0, // 0 Code used when the status is still to be decided.
                msg_intention: 'CREATE',
                name,
                start: startDate,
                end: endDate,
                venueIDs: [''], // Placeholder as venue assignment not in API yet.
                attendance: 0, // Placeholder.
            };

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_CREATE,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
