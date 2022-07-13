import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { SignupMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { AuthUtilities } from '../../utilities/AuthUtilities';
import * as zod from 'zod';
import { asana, asNumber, copyKeysIfDefined, describe, endpoint, mapKeysIfDefined, Method, tag } from '../../decorators/endpoint';
import { SignupValidators } from '@uems/uemscommlib/build/signup/SignupValidators';
import { Configuration } from '../../configuration/Configuration';
import ReadSignupMessage = SignupMessage.ReadSignupMessage;
import CreateSignupMessage = SignupMessage.CreateSignupMessage;
import UpdateSignupMessage = SignupMessage.UpdateSignupMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import orProtect = AuthUtilities.orProtect;
import ZSignup = SignupValidators.ZSignup;
import Attachment = GatewayMk2.Attachment;

type GetSignupQuery = {
    id?: string,
    date?: number,
    userid?: string,
    dateRangeBegin?: number,
    dateRangeEnd?: number,
    role?: string,
};

type PostSignupBody = {
    role: string,
    signupUser?: string
};

export class SignupGatewayInterface extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.GET,
        ['events', {
            key: 'eventID',
            description: 'The unique event identifier',
        }, 'signups'],
        ['SignupList', zod.array(ZSignup)],
        ['ents'],
        zod.object({
            id: zod.string(),
            date: asNumber(),
            userid: zod.string(),
            dateRangeBegin: asNumber(),
            dateRangeEnd: asNumber(),
            role: zod.string(),
        })
            .partial(),
    )
    @tag('signup')
    @describe(
        'Get signups',
        'Returns signups from the given event, filtered by the given opens',
    )
    public async querySignupsHandler(req: Request, res: Response, query: GetSignupQuery, _: undefined) {
        const outgoing: ReadSignupMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            event: req.params.eventID,
        };

        copyKeysIfDefined([
            'id', 'role', 'date',
        ], query, outgoing);

        mapKeysIfDefined({
            userid: 'user',
        }, query, outgoing);

        if (query.dateRangeBegin || query.dateRangeEnd) {
            outgoing.date = {
                less: query.dateRangeEnd,
                greater: query.dateRangeBegin,
            };
        }

        await this.send(
            ROUTING_KEY.signups.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveSignups(
                this.resolver,
                req.uemsUser.userID,
                false,
            )),
        );
    }

    @endpoint(
        Method.GET,
        ['events', {
            key: 'eventID',
            description: 'The unique identifier for this event',
        }, 'signups', {
            key: 'id',
            description: 'The ID of the signup registered against this event',
        }],
        ['Signup', ZSignup],
        ['ents', 'admin'],
    )
    @asana('0/0/1201549453029903/f', 'Should event owners be able to see assigned techs?')
    @tag('event', 'signup')
    @describe(
        'Get details of a signup',
        'This will return details of a single signup identified by ID on an event if the record exists',
    )
    public async getSignupHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadSignupMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            event: req.params.eventID,
            id: req.params.id,
        };

        await this.send(
            ROUTING_KEY.signups.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleSignup(
                this.resolver,
                req.uemsUser.userID,
                true,
            )),
        );
    }

    @endpoint(
        Method.POST,
        ['events', {
            key: 'eventID',
            description: 'The unique identifier for this event',
        }, 'signups'],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            role: zod.string(),
            signupUser: zod.string()
                .optional(),
        }),
    )
    @tag('signup', 'event')
    @describe(
        'Add a signup to an event',
        'With this endpoint you can register to join an event (authentication as ops or ents required), or '
        + 'sign another user up to the event (must be an admin)',
    )
    public async createSignupHandler(req: Request, res: Response, _: undefined, body: PostSignupBody) {
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (req.params.signupUser && req.params.signupUser !== req.uemsUser.userID) {
                // Signing up another user, mu for now
                if (!orProtect('admin')(req.kauth.grant.access_token)) {
                    res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
                    return;
                }
                // Signing up themselves, must be an ent or an admin
            } else if (!orProtect('ents', 'admin')(req.kauth.grant.access_token)) {
                res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
                return;
            }
        } else {
            res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
            return;
        }

        const outgoingMessage: CreateSignupMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            event: req.params.eventID,
            user: body.signupUser ?? req.uemsUser.userID,
            role: body.role,
            date: Math.floor(Date.now() / 1000),
        };

        await this.send(
            ROUTING_KEY.signups.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['events', {
            key: 'eventID',
            description: 'The unique identifier for this event',
        }, 'signups', {
            key: 'id',
            description: 'The unique identifier for this signup',
        }],
        ['ModifyResponse', zod.array(zod.string())],
    )
    @tag('signup', 'event')
    @describe(
        'Remove a signup',
        'With this endpoint you can remove your own signup from an event or the sign up of another user '
        + '(if you are an ent, ops or admin)',
    )
    public async deleteSignupHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'signup',
            }, this.resolver, this.handler, res, localOnly);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    // {
    //     action: 'patch',
    //     path: '/events/:eventID/signups/:id',
    //     handle: this.updateSignupHandler(send),
    //     additionalValidator: validator,
    // },
    @endpoint(
        Method.PATCH,
        ['events', {
            key: 'eventID',
            description: 'The unique identifier for this event',
        }, 'signups', {
            key: 'id',
            description: 'The unique identifier for this signup',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            role: zod.string(),
        }),
    )
    @tag('signup', 'event')
    @describe(
        'Update a signup',
        'You can change the role of the signup on this signup on the provided event. If you are an admin '
        + 'you can edit any signup, otherwise it will only be your own signups',
    )
    public async updateSignupHandler(req: Request, res: Response, _: undefined, body: { role: string }) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('admin')(req.kauth.grant.access_token)) {
                localOnly = false;
            }
        }

        const outgoing: UpdateSignupMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
            userScoped: localOnly,
            role: body.role,
        };

        await this.send(
            ROUTING_KEY.signups.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
