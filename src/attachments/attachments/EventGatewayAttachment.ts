import { Request, Response } from 'express';
import { EventMessage, EventResponse, EventResponseValidator, MessageIntention, VenueResponse } from '@uems/uemscommlib';
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
import InternalVenue = VenueResponse.InternalVenue;
import InternalEvent = EventResponse.InternalEvent;
import ShallowInternalEvent = EventResponse.ShallowInternalEvent;

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

    // @ts-ignore - TODO fix the types on this somehow
    private readonly DEPENDENCY_TRANSFORMER: GenericHandlerFunctions.Transformer<EventReadResponseMessage> = async (data: ShallowInternalEvent[]) => {
        console.log('transforming', data);

        const entries: Promise<any>[] = [];
        for (const entry of data) {
            // RESOLVE VENUES
            if (entry.venues === undefined) entry.venues = [];

            const resolved: InternalVenue[] = [];
            console.log('(ENTRY)', entry, entry.venues);
            const promises = (entry.venues.filter((e) => typeof (e) === 'string') as string[])
                .map((id) => (async () => {
                    const venue = await this._resolver.resolveVenue(id);
                    resolved.push(venue);
                })());

            entries.push((async () => {
                await Promise.all(promises);
                (entry as InternalEvent).venues = resolved;
            })());

            // THEN RESOLVE ENTS
            if (entry.ents) {
                entries.push((async () => {
                    (entry as InternalEvent).ents = await this._resolver.resolveEntState(entry.ents as string);
                })());
            }

            // THEN RESOLVE STATE
            if (entry.state) {
                entries.push((async () => {
                    (entry as InternalEvent).state = await this._resolver.resolveState(entry.state as string);
                })());
            }
        }

        await Promise.all(entries);

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

            outgoingMessage.id = req.params.id;

            console.log(outgoingMessage);

            await send(
                EVENT_DETAILS_SERVICE_TOPIC_GET,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(
                    async (data) => ({
                        event: (await this.DEPENDENCY_TRANSFORMER([data]))[0],
                        changelog: [],
                    }),
                ),
            );
        };
    }

    private static createEventHandler(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const validate = MessageUtilities.verifyParameters(
                request,
                res,
                ['name', 'attendance', 'start', 'end', 'venue'],
                {
                    // Required
                    name: (x) => typeof (x) === 'string',
                    venue: (x) => typeof (x) === 'string',
                    start: (x) => typeof (x) === 'number',
                    end: (x) => typeof (x) === 'number',
                    attendance: (x) => typeof (x) === 'number',

                    // Optional
                    state: (x) => typeof (x) === 'string',
                    ents: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const {
                name,
                start,
                end,
                venue,
                state,
                ents,
                attendance,
            } = request.body;

            const msg: CreateEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0, // 0 Code used when the status is still to be decided.
                msg_intention: 'CREATE',

                name,
                start,
                end,
                venueIDs: [venue], // Placeholder as venue assignment not in API yet.
                attendance, // Placeholder.
                stateID: state,
                entsID: ents,
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
