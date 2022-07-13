import { Request, Response } from 'express';
import { CommentMessage, EventMessage, EventResponse } from '@uems/uemscommlib';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { GatewayMk2 } from '../../Gateway';
import { EntityResolver } from '../../resolver/EntityResolver';
import { constants } from 'http2';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { AuthUtilities } from '../../utilities/AuthUtilities';
import * as zod from 'zod';
import { logInfo, logResolve } from '../../log/RequestLogger';
import { EventValidators } from '@uems/uemscommlib/build/event/EventValidators';
import log from '@uems/micro-builder/build/src/logging/Log';
import { resolveEventsFlow } from '../../flows/EventResolveFlow';
import { copyKeysIfDefined, describe, endpoint, mapKeysIfDefined, Method, tag } from '../../decorators/endpoint';
import { CommentValidators } from '@uems/uemscommlib/build/comment/CommentValidators';
import { Configuration } from '../../configuration/Configuration';
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import UpdateEventMessage = EventMessage.UpdateEventMessage;
import ReadEventMessage = EventMessage.ReadEventMessage;
import CreateEventMessage = EventMessage.CreateEventMessage;
import ShallowInternalEvent = EventResponse.ShallowInternalEvent;
import ReadCommentMessage = CommentMessage.ReadCommentMessage;
import CreateCommentMessage = CommentMessage.CreateCommentMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import orProtect = AuthUtilities.orProtect;
import sendZodError = MessageUtilities.sendZodError;
import UpdateCommentMessage = CommentMessage.UpdateCommentMessage;
import EventRepresentation = EventValidators.EventRepresentation;
import Attachment = GatewayMk2.Attachment;
import ZEvent = EventValidators.ZEvent;
import ZComment = CommentValidators.ZComment;

const _ = log.auto;

type QueryQueryEvents = Partial<{
    attendance: number,
    attendanceGreater: number,
    attendanceLess: number,
    end: number,
    endAfter: number,
    endBefore: number,
    entsID: string,
    name: string,
    start: number,
    startAfter: number,
    startBefore: number,
    stateID: string,
    venueCriteria: string,
    venueIDs: string[],
}>;

type CreateBodyComment = {
    topic?: string,
    requiresAttention?: boolean,
    body: string,
};

type CreateBodyEvent = {
    name: string,
    venue: string,
    start: number,
    end: number,
    attendance: number,
    state?: string,
    ents?: string
};

type UpdateBodyEvent = Partial<{
    name: string,
    start: number,
    end: number,
    attendance: number,
    addVenues: string[],
    removeVenues: string[],
    ents: string,
    state: string,
    reserved: boolean,
}>;

export class EventGatewayAttachment extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.PATCH,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
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
            .partial(),
    )
    @tag('event')
    @describe(
        'Updates this event',
        'This will modify the properties of the event as requested',
    )
    public async updateEventHandler(req: Request, res: Response, _0: undefined, body: UpdateBodyEvent) {
        const eventId = req.params.id;

        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
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

        if (body.name) msg.name = body.name;
        if (body.start) msg.start = body.start;
        if (body.end) msg.end = body.end;
        if (body.attendance) msg.attendance = body.attendance;
        if (body.addVenues) msg.addVenues = body.addVenues;
        if (body.removeVenues) msg.removeVenues = body.removeVenues;
        if (body.ents) msg.ents = body.ents;
        if (body.state) msg.state = body.state;
        if (body.reserved !== undefined) msg.reserved = body.reserved;

        await this.send(
            ROUTING_KEY.event.update,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['events'],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            name: zod.string(),
            venue: zod.string(),
            start: zod.number(),
            end: zod.number(),
            attendance: zod.number(),
            state: zod.string()
                .optional(),
            ents: zod.string()
                .optional(),
        }),
    )
    @tag('event')
    @describe(
        'Create a new event',
        'Creates a new event with the given configuration',
    )
    public async createEventHandler(request: Request, res: Response, _0: undefined, body: CreateBodyEvent) {
        const {
            name,
            start,
            end,
            venue,
            state,
            ents,
            attendance,
        } = body;

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

        await this.send(
            ROUTING_KEY.event.create,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['events', {
            key: 'id',
            description: 'The unique ID for this event',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
    )
    @tag('event')
    @describe(
        'Delete an event',
        'This will try and delete the event as long as no other objects rely on the entity. This is '
        + 'restricted to staff as for users events should be cancelled rather than deleted to provide a comprehensive '
        + 'audit trail of the processes. ',
    )
    public async deleteEventHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        _(req.requestID)
            .trace('dispatch to removeAndReply', req.params.id);
        await removeAndReply({
            assetID: req.params.id,
            assetType: 'event',
        }, this.resolver, this.handler, res);
    }

    @endpoint(
        Method.GET,
        ['events'],
        ['EventList', zod.array(ZEvent)],
        undefined,
        zod.object({
            attendance: zod.preprocess((v) => Number(v), zod.number()),
            attendanceGreater: zod.preprocess((v) => Number(v), zod.number()),
            attendanceLess: zod.preprocess((v) => Number(v), zod.number()),
            end: zod.preprocess((v) => Number(v), zod.number()),
            endAfter: zod.preprocess((v) => Number(v), zod.number()),
            endBefore: zod.preprocess((v) => Number(v), zod.number()),
            entsID: zod.string(),
            name: zod.string(),
            start: zod.preprocess((v) => Number(v), zod.number()),
            startAfter: zod.preprocess((v) => Number(v), zod.number()),
            startBefore: zod.preprocess((v) => Number(v), zod.number()),
            stateID: zod.string(),
            venueCriteria: zod.string(),
            venueIDs: zod.array(zod.string()),
        }).partial(),
    )
    @tag('event')
    @describe(
        'Retrieve events matching a filter',
        'Returns all events matching the filters defined in the query',
    )
    public async getEventsHandler(req: Request, res: Response, query: QueryQueryEvents, _0: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const msg: ReadEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID: req.uemsUser.userID,
            userScoped: localOnly,
        };

        copyKeysIfDefined([
            'name', 'end', 'start', 'attendance',
        ], query, msg);

        mapKeysIfDefined({
            venueIDs: 'venues',
            entsID: 'ents',
            stateID: 'state',
        }, query, msg);

        if (query.startAfter !== undefined) {
            if (typeof (msg.start) === 'object') {
                msg.start = {
                    ...msg.start,
                    greater: query.startAfter,
                };
            } else {
                msg.start = { greater: query.startAfter };
            }
        }

        if (query.startBefore !== undefined) {
            if (typeof (msg.start) === 'object') {
                msg.start = {
                    ...msg.start,
                    less: query.startBefore,
                };
            } else {
                msg.start = { less: query.startBefore };
            }
        }

        if (query.endAfter !== undefined) {
            if (typeof (msg.end) === 'object') {
                msg.end = {
                    ...msg.end,
                    greater: query.endAfter,
                };
            } else {
                msg.end = { greater: query.endAfter };
            }
        }

        if (query.endBefore !== undefined) {
            if (typeof (msg.end) === 'object') {
                msg.end = {
                    ...msg.end,
                    less: query.endBefore,
                };
            } else {
                msg.end = { less: query.endBefore };
            }
        }

        if (query.attendanceGreater !== undefined || query.attendanceLess !== undefined) {
            msg.attendance = {
                ...(query.attendanceGreater ? { greater: query.attendanceGreater } : {}),
                ...(query.attendanceLess ? { less: query.attendanceLess } : {}),
            };
        }

        console.log(this, this.send);

        await this.send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    }

    @endpoint(
        Method.GET,
        ['events', {
            key: 'id',
            description: 'The unique ID of this event',
        }],
        ['UEMSEventWithChangelog', zod.object({
            event: ZEvent,
            changelog: zod.array(zod.never()),
        })],
    )
    @tag('event')
    @describe(
        'Retrieves a single event',
        'Returns the event associated with the given ID if one exists',
    )
    public async getEventHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
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

        await this.send(
            ROUTING_KEY.event.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(
                async (data: ShallowInternalEvent) => ({
                    event: await Resolver.resolveSingleEvent(this.resolver, req.uemsUser.userID)(data, req.requestID),
                    changelog: [],
                }),
            ),
        );
    }

    @endpoint(
        Method.GET,
        ['states', {
            key: 'id',
            description: 'The unique ID of this state',
        }, 'events'],
        ['EventList', zod.array(ZEvent)],
    )
    @tag('event', 'state')
    @describe(
        'Returns all events for the given state',
        'This will return the details of all events which have the given state associated with them',
    )
    public async getEventsByState(req: Request, res: Response, _0: undefined, _1: undefined) {
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

        await this.send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    }

    @endpoint(
        Method.GET,
        ['venues', {
            key: 'id',
            description: 'The unique ID of the venue',
        }, 'events'],
        ['EventList', zod.array(ZEvent)],
    )
    @tag('event', 'venue')
    @describe(
        'Returns all events taking place in the given venue',
        'Returns all events that have ever taken place in the given venue',
    )
    public async getEventsByVenue(req: Request, res: Response, _0: undefined, _1: undefined) {
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
            anyVenues: [req.params.id],
            userScoped: localOnly,
        };

        await this.send(
            ROUTING_KEY.event.read,
            msg,
            res,
            resolveEventsFlow(this.handler),
        );
    }

    @endpoint(
        Method.GET,
        ['events', {
            key: 'id',
            description: 'The unique ID for this event',
        }, 'comments'],
        ['CommentList', zod.array(ZComment)],
    )
    @tag('event', 'comment')
    @describe(
        'Returns all comments on the event',
        'Returns all comments which are associated with the given event identifier',
    )
    public async getCommentsForEvent(req: Request, res: Response, _0: undefined, _1: undefined) {
        // TODO add failures
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
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

        await this.send(
            ROUTING_KEY.event.comments.read,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveComments(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.POST,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }, 'comments'],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            topic: zod.string()
                .optional(),
            requiresAttention: zod.boolean()
                .optional(),
            body: zod.string(),
        }),
    )
    @tag('event', 'comment')
    @describe(
        'Posts a new comment on this event',
        'Adds a new comment to the event associated with the id provided',
    )
    public async postCommentsForEvent(request: Request, res: Response, _0: undefined, body: CreateBodyComment) {
        const {
            topic,
            requiresAttention,
            body: content,
        } = body;

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
            body: content,
            userScoped: localOnly,

            assetID: request.params.id,
            assetType: 'event',
            poster: request.uemsUser.userID,
            posted: Math.floor(Date.now() / 1000),
        };

        await this.send(
            ROUTING_KEY.event.comments.create,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }, 'comments', {
            key: 'commentID',
            description: 'The unique identifier for the comment associated with this event',
        }, 'attention'],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'ents', 'admin'],
    )
    @tag('event', 'comment')
    @describe(
        'Marks this comment as requiring attention',
        'This will flag this comment as needing attention from another member of staff before the event can go ahead',
    )
    public async markCommentAsRequiringAttention(req: Request, res: Response, _0: undefined, _1: undefined) {
        const {
            id: eventID,
            commentID,
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
            assetID: eventID,
        };

        await this.send(
            ROUTING_KEY.event.comments.update,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }, 'comments', {
            key: 'commentID',
            description: 'The unique identifier for the comment associated with this event',
        }, 'resolve'],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'ents', 'admin'],
    )
    @tag('event', 'comment')
    @describe(
        'Marks a comment as resolved',
        'Marks the comment on the given event as resolved meaning it no longer requires attention by '
        + 'another staff member',
    )
    public async markCommentAsResolved(req: Request, res: Response, _0: undefined, _1: undefined) {
        const {
            id: eventID,
            commentID,
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
            assetID: eventID,
        };

        await this.send(
            ROUTING_KEY.event.comments.update,
            msg,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['events', 'review'],
        ['EventList', zod.array(ZEvent)],
        ['ops', 'ents', 'admin'],
    )
    @tag('event', 'ops')
    @describe(
        'Retrieves all events requiring attention',
        'This will return all events that are currently marked with the review state or who have not yet '
        + 'had their time reserved in the booking system',
    )
    public async getReviewEvents(req: Request, res: Response, _0: undefined, _1: undefined) {
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
    }
}
