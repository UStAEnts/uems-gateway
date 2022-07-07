import { Request, Response } from 'express';
import { CommentMessage, EventMessage, EventResponse, EventResponseValidator } from '@uems/uemscommlib';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { GatewayMk2 } from '../../Gateway';
import { EntityResolver } from '../../resolver/EntityResolver';
import { constants } from 'http2';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import UpdateEventMessage = EventMessage.UpdateEventMessage;
import ReadEventMessage = EventMessage.ReadEventMessage;
import CreateEventMessage = EventMessage.CreateEventMessage;
import ShallowInternalEvent = EventResponse.ShallowInternalEvent;
import ReadCommentMessage = CommentMessage.ReadCommentMessage;
import CreateCommentMessage = CommentMessage.CreateCommentMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { AuthUtilities } from "../../utilities/AuthUtilities";
import orProtect = AuthUtilities.orProtect;
import * as zod from 'zod';
import sendZodError = MessageUtilities.sendZodError;
import UpdateCommentMessage = CommentMessage.UpdateCommentMessage;
import { Configuration } from "../../configuration/Configuration";
import { logInfo, logResolve } from "../../log/RequestLogger";
import { EventValidators } from "@uems/uemscommlib/build/event/EventValidators";
import EventRepresentation = EventValidators.EventRepresentation;
import log from '@uems/micro-builder/build/src/logging/Log';
import { resolveEventsFlow } from "../../flows/EventResolveFlow";

const _ = log.auto;

export class EventGatewayAttachment implements GatewayAttachmentInterface {
    // TODO: bit dangerous using ! - maybe add null checks?
    private _resolver!: EntityResolver;
    private handler?: GatewayMessageHandler;
    private config?: Configuration;

    private static deleteEventHandler(send: SendRequestFunction, hand: GatewayMessageHandler, resolve: EntityResolver) {
        return async (req: Request, res: Response) => {

            if (resolve && hand) {
                _(req.requestID)
                    .trace('dispatch to removeAndReply', req.params.id);
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'event',
                }, resolve, hand, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private static updateEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const eventId = req.params.id;

            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const msg: UpdateEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'UPDATE',
                id: eventId,
                userID: req.uemsUser.userID,
                userScoped: localOnly,
            };

            // TODO: isn't this in commslib somewhere?
            const validate = zod.object({
                name: zod.string(),
                start: zod.number(),
                end: zod.number(),
                attendance: zod.number(),
                addVenues: zod.array(zod.string()),
                removeVenues: zod.array(zod.string()),
                ents: zod.string(),
                state: zod.string(),
                reserved: zod.boolean(),
            })
                .partial()
                .safeParse(req.body);

            if (!validate.success) {
                _(req.requestID)
                    .debug('request failed validation', validate.error);
                sendZodError(res, validate.error);
                return;
            }

            const body = validate.data;

            if (body.name) msg.name = body.name;
            if (body.start) msg.start = body.start;
            if (body.end) msg.end = body.end;
            if (body.attendance) msg.attendance = body.attendance;
            if (body.addVenues) msg.addVenues = body.addVenues;
            if (body.removeVenues) msg.removeVenues = body.removeVenues;
            if (body.ents) msg.ents = body.ents;
            if (body.state) msg.state = body.state;
            if (body.reserved !== undefined) msg.reserved = body.reserved;

            await send(
                ROUTING_KEY.event.update,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private static createEventHandler(send: SendRequestFunction) {
        return async (request: Request, res: Response) => {
            const validate = zod.object({
                name: zod.string(),
                venue: zod.string(),
                start: zod.number(),
                end: zod.number(),
                attendance: zod.number(),
                state: zod.string()
                    .optional(),
                ents: zod.string()
                    .optional(),
            })
                .safeParse(request.body);

            if (!validate.success) {
                _(request.requestID)
                    .debug(`request failed validation`, validate.error);
                sendZodError(res, validate.error);
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
                author: request.uemsUser.userID,

                name,
                start,
                end,
                venues: [venue], // Placeholder as venue assignment not in API yet.
                attendance, // Placeholder.
                state,
                ents,
            };

            await send(
                ROUTING_KEY.event.create,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    async generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
        config: Configuration,
    ): Promise<GatewayInterfaceActionType[]> {
        const validator = new EventResponseValidator();

        this.config = config;
        this._resolver = resolver;
        this.handler = handler;

        return [
            // Ops planning
            {
                action: 'get',
                path: '/events/review',
                handle: this.getReviewEvents(send),
                secure: ['ops', 'ents', 'admin'],
            },
            //
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
                secure: ['ops', 'admin'], // events shouldn't be deleted, just cancelled
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
            {
                action: 'post',
                path: '/events/:id/comments/:commentID/attention',
                handle: this.markCommentAsRequiringAttention(send),
                secure: ['ops', 'ents', 'admin'],
            },
            {
                action: 'post',
                path: '/events/:id/comments/:commentID/resolve',
                handle: this.markCommentAsResolved(send),
                secure: ['ops', 'ents', 'admin'],
            },
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

        ];
    }

    private getEventsHandler = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures
        if (this.handler === undefined) {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return;
        }

        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            // req.kauth.grant.kauth
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const validate = MessageUtilities.coerceAndVerifyQuery(
            req,
            res,
            [],
            {
                attendance: { primitive: 'number' },
                attendanceGreater: { primitive: 'number' },
                attendanceLess: { primitive: 'number' },
                end: { primitive: 'number' },
                endafter: { primitive: 'number' },
                endbefore: { primitive: 'number' },
                entsID: { primitive: 'string' },
                name: { primitive: 'string' },
                start: { primitive: 'number' },
                startafter: { primitive: 'number' },
                startbefore: { primitive: 'number' },
                stateID: { primitive: 'string' },
                venueCriteria: { primitive: 'string' },
                venueIDs: {
                    primitive: 'array',
                    validator: (x) => Array.isArray(x) && x.every((e) => typeof (e) === 'string')
                },
            },
        );

        if (!validate) {
            _(req.requestID)
                .debug('request failed validation', req.query);
            return;
        }

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
            userScoped: localOnly,
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
                msg.venues = req.query.venueIDs.split(',');
            }
        }

        if (req.query.entsID !== undefined && typeof (req.query.entsID) === 'string') {
            msg.ents = req.query.entsID;
        }

        if (req.query.stateID !== undefined && typeof (req.query.stateID) === 'string') {
            msg.state = req.query.stateID;
        }

        if (req.query.startafter !== undefined) {
            if (typeof (msg.start) === 'object') {
                msg.start = {
                    ...msg.start,
                    greater: parseInt(req.query.startafter.toString(), 10)
                };
            } else {
                msg.start = { greater: parseInt(req.query.startafter.toString(), 10) };
            }
        }

        if (req.query.startbefore !== undefined) {
            if (typeof (msg.start) === 'object') {
                msg.start = {
                    ...msg.start,
                    less: parseInt(req.query.startbefore.toString(), 10)
                };
            } else {
                msg.start = { less: parseInt(req.query.startbefore.toString(), 10) };
            }
        }

        if (req.query.endafter !== undefined) {
            if (typeof (msg.end) === 'object') {
                msg.end = {
                    ...msg.end,
                    greater: parseInt(req.query.endafter.toString(), 10)
                };
            } else {
                msg.end = { greater: parseInt(req.query.endafter.toString(), 10) };
            }
        }

        if (req.query.endbefore !== undefined) {
            if (typeof (msg.end) === 'object') {
                msg.end = {
                    ...msg.end,
                    less: parseInt(req.query.endbefore.toString(), 10)
                };
            } else {
                msg.end = { less: parseInt(req.query.endbefore.toString(), 10) };
            }
        }

        if (req.query.attendanceGreater !== undefined || req.query.attendanceLess !== undefined) {
            msg.attendance = {
                ...(req.query.attendanceGreater ? { greater: parseInt(req.query.attendanceGreater.toString(), 10) } : {}),
                ...(req.query.attendanceLess ? { less: parseInt(req.query.attendanceLess.toString(), 10) } : {}),
            };
        }

        await send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    };

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const outgoingMessage: ReadEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
                userScoped: localOnly,
            };

            await send(
                ROUTING_KEY.event.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(
                    async (data: ShallowInternalEvent) => ({
                        event: await Resolver.resolveSingleEvent(this._resolver, req.uemsUser.userID)(data, req.requestID),
                        changelog: [],
                    }),
                ),
            );
        };
    }

    private getEventsByState = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        if (this.handler === undefined) {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return;
        }

        // TODO add failures
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
            state: req.params.id,
            userScoped: localOnly,
        };

        await send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    };

    private getEventsByVenue = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        if (this.handler === undefined) {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return;
        }
        // TODO add failures
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            // req.kauth.grant.kauth
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
            anyVenues: [req.params.id],
            userScoped: localOnly,
        };

        await send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    };

    private getCommentsForEvent = (send: SendRequestFunction) => async (req: Request, res: Response) => {
        // TODO add failures
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            // req.kauth.grant.kauth
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const msg: ReadCommentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
            userScoped: localOnly,
            assetType: 'event',
            assetID: req.params.id,
        };

        await send(
            ROUTING_KEY.event.comments.read,
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
            const validate = zod.object({
                topic: zod.string()
                    .optional(),
                requiresAttention: zod.boolean()
                    .optional(),
                body: zod.string()
            })
                .safeParse(request.body);

            if (!validate.success) {
                _(request.requestID)
                    .debug(`request failed validation`, validate.error);
                sendZodError(res, validate.error);
                return;
            }

            const {
                topic,
                requiresAttention,
                body,
            } = request.body;

            let localOnly = true;
            if (request.kauth && request.kauth.grant && request.kauth.grant.access_token) {
                if (orProtect('ops', 'ents', 'admin')(request.kauth.grant.access_token)) localOnly = false;
            }

            const msg: CreateCommentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0, // 0 Code used when the status is still to be decided.
                msg_intention: 'CREATE',
                userID: request.uemsUser.userID,

                topic,
                requiresAttention,
                body,
                userScoped: localOnly,

                assetID: request.params.id,
                assetType: 'event',
                poster: request.uemsUser.userID,
                posted: Math.floor(Date.now() / 1000),
            };

            await send(
                ROUTING_KEY.event.comments.create,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private markCommentAsRequiringAttention(send: SendRequestFunction) {
        /**
         * = Mark a comment as requiring attention =
         *
         * [POST] /events/:id/comments/:commentID/attention
         *                ^            ^
         *                Event ID     ^
         *                             Comment ID on this event
         *
         * Body:
         *     N/A
         */
        return async (req: Request, res: Response) => {
            const {
                id: eventID,
                commentID
            } = req.params;

            const msg: UpdateCommentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'UPDATE',
                id: commentID,
                userID: req.uemsUser.userID,
                requiresAttention: true,
                userScoped: false,
                attendedBy: undefined,
            };

            await send(
                ROUTING_KEY.event.comments.update,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        }
    }

    private markCommentAsResolved(send: SendRequestFunction) {
        /**
         * = Mark a comment as attended to, using the person who issues the request as the resolver =
         *
         * [POST] /events/:id/comments/:commentID/resolve
         *                ^            ^
         *                Event ID     ^
         *                             Comment ID on this event
         *
         * Body:
         *     N/A
         */
        return async (req: Request, res: Response) => {
            const {
                id: eventID,
                commentID
            } = req.params;

            const msg: UpdateCommentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'UPDATE',
                id: commentID,
                userID: req.uemsUser.userID,
                requiresAttention: false,
                userScoped: false,
                attendedBy: req.uemsUser.userID,
            };

            await send(
                ROUTING_KEY.event.comments.update,
                msg,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        }
    }

    private getReviewEvents(send: SendRequestFunction) {
        /**
         * = Gets events marked as needing review =
         *
         * [POST] /events/review
         *
         * Body:
         *     N/A
         */
        return async (req: Request, res: Response) => {
            if (this.handler === undefined) {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                return;
            }

            if (!this.config) {
                _(req.requestID)
                    .error('event gateway attachment configuration was not defined');
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                logResolve(req.requestID,
                    constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                return;
            }

            let states;
            try {
                states = await this.config.getReviewStates();
            } catch (e: any) {
                _(req.requestID)
                    .error('retrieving review states from configuration threw an error', e);
                logInfo(req.requestID, `Failed to get review states due to error: ${e.message}`);
                logResolve(req.requestID,
                    constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                return;
            }

            const msg: ReadEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'READ',
                userID: req.uemsUser.userID,
                stateIn: states,
            };
            console.log('stateIn', states);

            const msgNotReserved: ReadEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                status: 0,
                msg_intention: 'READ',
                userID: req.uemsUser.userID,
                reserved: false,
            };

            const msgPromise = new Promise((resolve, reject) => {
                this.handler?.buildSend(
                    ROUTING_KEY.event.read,
                    msg
                )
                    .name('request-statuses')
                    .fail(reject)
                    .reply(resolve)
                    .submit(req.requestID);
            });
            const msgReservedPromise = new Promise((resolve, reject) => {
                this.handler?.buildSend(
                    ROUTING_KEY.event.read,
                    msgNotReserved
                )
                    .name('request-statuses')
                    .fail(reject)
                    .reply(resolve)
                    .submit(req.requestID);
            });

            let results: [EventRepresentation[], EventRepresentation[]];
            try {
                results = await Promise.all([msgPromise, msgReservedPromise]) as any;
            } catch (e) {
                _(req.requestID)
                    .debug('failed to fetch events matching', e);
                res
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                return;
            }

            // Now deduplicate
            const events: EventRepresentation[] = [];
            const addedIDs: string[] = [];
            const flattened = [...results[0], ...results[1]];
            for (const result of flattened) {
                if (!addedIDs.includes(result.id)) {
                    events.push(result);
                    addedIDs.push(result.id);
                }
            }

            await resolveEventsFlow(this.handler)(
                res,
                Date.now(),
                {
                    status: 200,
                    msg_id: -1,
                    result: events,
                },
            );
        };
    }
}
