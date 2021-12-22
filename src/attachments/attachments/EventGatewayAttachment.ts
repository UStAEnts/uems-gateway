import { Request, Response } from 'express';
import { CommentMessage, CommentResponse, EventMessage, EventResponse, EventResponseValidator, MsgStatus, VenueResponse } from '@uems/uemscommlib';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { GatewayMk2 } from '../../Gateway';
import { EntityResolver } from '../../resolver/EntityResolver';
import { constants } from 'http2';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from "../Resolvers";
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import DeleteEventMessage = EventMessage.DeleteEventMessage;
import UpdateEventMessage = EventMessage.UpdateEventMessage;
import ReadEventMessage = EventMessage.ReadEventMessage;
import CreateEventMessage = EventMessage.CreateEventMessage;
import ShallowInternalEvent = EventResponse.ShallowInternalEvent;
import ReadCommentMessage = CommentMessage.ReadCommentMessage;
import CreateCommentMessage = CommentMessage.CreateCommentMessage;
import { Constants } from "../../utilities/Constants";
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { removeAndReply, removeEntity } from "../DeletePipelines";
import { ErrorCodes } from "../../constants/ErrorCodes";

export class EventGatewayAttachment implements GatewayAttachmentInterface {
    // TODO: bit dangerous using ! - maybe add null checks?
    private _resolver!: EntityResolver;
    private handler?: GatewayMessageHandler;

    async generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): Promise<GatewayInterfaceActionType[]> {
        const validator = await EventResponseValidator.setup();

        this._resolver = resolver;
        this.handler = handler;

        return [
            // EVENTS ONLY
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
                handle: EventGatewayAttachment.deleteEventHandler(send, handler, resolver),
                additionalValidator: validator,
            },
            // EVENT <--> STATE LINK
            {
                action: 'get',
                path: '/states/:id/events',
                handle: this.getEventsByState(send),
                additionalValidator: validator,
            },
            // EVENT <--> VENUE LINK
            {
                action: 'get',
                path: '/venues/:id/events',
                handle: this.getEventsByVenue(send),
                additionalValidator: validator,
            },
            // EVENT COMMENTS
            {
                action: 'get',
                path: '/events/:id/comments',
                handle: this.getCommentsForEvent(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/events/:id/comments',
                handle: this.postCommentsForEvent(send),
            },
        ];
    }

    private static deleteEventHandler(send: SendRequestFunction, hand: GatewayMessageHandler, resolve: EntityResolver) {
        return async (req: Request, res: Response) => {

            if (resolve && hand) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'event',
                }, resolve, hand, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
            // const msg: DeleteEventMessage = {
            //     msg_id: MessageUtilities.generateMessageIdentifier(),
            //     status: 0,
            //     msg_intention: 'DELETE',
            //     id: eventId,
            //     userID: req.uemsUser.userID,
            // };
            //
            // await send(
            //     ROUTING_KEY.event.delete,
            //     msg,
            //     res,
            //     GenericHandlerFunctions.handleReadSingleResponseFactory(),
            // );
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
                userID: req.uemsUser.userID,
            };

            const validate = MessageUtilities.verifyBody(
                req,
                res,
                [],
                {
                    name: (x) => typeof (x) === 'string' || typeof (x) === 'undefined',
                    start: (x) => typeof (x) === 'number' || typeof (x) === 'undefined',
                    end: (x) => typeof (x) === 'number' || typeof (x) === 'undefined',
                    attendance: (x) => typeof (x) === 'number' || typeof (x) === 'undefined',
                    addVenues: (x) => Array.isArray(x) || typeof (x) === 'undefined',
                    removeVenues: (x) => Array.isArray(x) || typeof (x) === 'undefined',
                    ents: (x) => typeof (x) === 'string' || typeof (x) === 'undefined',
                    state: (x) => typeof (x) === 'string' || typeof (x) === 'undefined',
                },
            );

            if (!validate) {
                return;
            }

            const {
                name,
                start,
                end,
                attendance,
                addVenues,
                removeVenues,
                ents,
                state,
            } = req.body;

            if (name !== undefined) {
                msg.name = name.toString();
            }

            if (start !== undefined) {
                msg.start = start;
            }

            if (end !== undefined) {
                msg.end = end;
            }

            if (attendance !== undefined) {
                msg.attendance = attendance;
            }

            if (addVenues !== undefined) {
                msg.addVenues = addVenues;
            }

            if (removeVenues !== undefined) {
                msg.removeVenues = removeVenues;
            }

            if (ents !== undefined) {
                msg.entsID = ents;
            }

            if (state !== undefined) {
                msg.stateID = state;
            }

            await send(
                ROUTING_KEY.event.update,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventsHandler = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures

        const validate = MessageUtilities.coerceAndVerifyQuery(
            req,
            res,
            [],
            {
                name: { primitive: 'string' },
                start: { primitive: 'number' },
                end: { primitive: 'number' },
                attendance: { primitive: 'number' },
                venueIDs: { primitive: 'array' },
                venueCriteria: { primitive: 'string' },
                entsID: { primitive: 'string' },
                stateID: { primitive: 'string' },
                startafter: { primitive: 'number' },
                startbefore: { primitive: 'number' },
                endafter: { primitive: 'number' },
                endbefore: { primitive: 'number' },
                attendanceGreater: { primitive: 'number' },
                attendanceLess: { primitive: 'number' },
            },
        );

        if (!validate) {
            return;
        }

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
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
            ROUTING_KEY.event.read,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEvents(
                this._resolver,
                req.uemsUser.userID,
            )),
        );
    };

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
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

            await send(
                ROUTING_KEY.event.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(
                    async (data: ShallowInternalEvent) => ({
                        event: await Resolver.resolveSingleEvent(this._resolver, req.uemsUser.userID)(data),
                        changelog: [],
                    }),
                ),
            );
        };
    }

    private static createEventHandler(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const validate = MessageUtilities.verifyBody(
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
                userID: request.uemsUser.userID,

                name,
                start,
                end,
                venueIDs: [venue], // Placeholder as venue assignment not in API yet.
                attendance, // Placeholder.
                stateID: state,
                entsID: ents,
            };

            await send(
                ROUTING_KEY.event.create,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventsByState = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
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

        msg.stateID = req.params.id;

        await send(
            ROUTING_KEY.event.read,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEvents(
                this._resolver,
                req.uemsUser.userID,
            )),
        );
    };

    private getEventsByVenue = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
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

        msg.anyVenues = [req.params.id];

        await send(
            ROUTING_KEY.event.read,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEvents(
                this._resolver,
                req.uemsUser.userID,
            )),
        );
    };

    private getCommentsForEvent = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures

        const msg: ReadCommentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
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

        msg.assetType = 'event';
        msg.assetID = req.params.id;

        await send(
            'events.comment.get',
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveComments(
                this._resolver,
                req.uemsUser.userID,
            )),
        );
    };

    private postCommentsForEvent(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const validate = MessageUtilities.verifyBody(
                request,
                res,
                ['body'],
                {
                    // Required
                    category: (x) => typeof (x) === 'string',
                    requiresAttention: (x) => typeof (x) === 'boolean',
                    body: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const {
                category,
                requiresAttention,
                body,
            } = request.body;

            const msg: CreateCommentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0, // 0 Code used when the status is still to be decided.
                msg_intention: 'CREATE',
                userID: request.uemsUser.userID,

                category,
                requiresAttention,
                body,

                assetID: request.params.id,
                assetType: 'event',
                posterID: '5febba29be771bff36e059dd', // TODO needs swapping for actual info
            };

            await send(
                'events.comment.create',
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
