import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { StateMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { Configuration } from '../../configuration/Configuration';
import { copyKeysIfDefined, describe, endpoint, Method, tag } from '../../decorators/endpoint';
import { StateValidators } from '@uems/uemscommlib/build/state/StateValidators';
import ReadStateMessage = StateMessage.ReadStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import Attachment = GatewayMk2.Attachment;
import ZState = StateValidators.ZState;

const COLOR_REGEX = /^#?([\dA-Fa-f]{3}([\dA-Fa-f]{3})?)$/;

type GetStateQuery = {
    name?: string,
    icon?: string,
    color?: string,
    id?: string,
};

type PostStateBody = {
    name: string,
    icon: string,
    color: string,
};

type PatchStateBody = {
    name?: string,
    icon?: string,
    color?: string,
};

export class StateGatewayInterface extends Attachment {
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
        ['states'],
        ['StateList', zod.array(ZState)],
        undefined,
        zod.object({
            name: zod.string(),
            icon: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
            id: zod.string(),
        })
            .partial(),
    )
    @tag('state')
    @describe(
        'Search for a state',
        'Returns all states matching a particular query, otherwise return all the states in the system',
    )
    private async queryStatesHandler(req: Request, res: Response, query: GetStateQuery, _: undefined) {
        const outgoing: ReadStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        copyKeysIfDefined([
            'name', 'icon', 'color', 'id',
        ], query, outgoing);

        await this.send(
            ROUTING_KEY.states.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['states', {
            key: 'id',
            description: 'The unique ID for this state',
        }],
        ['State', ZState],
    )
    @tag('state')
    @describe(
        'Gets a state',
        'Returns the properties of a single individual state',
    )
    private async getStateHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        await this.send(
            ROUTING_KEY.states.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['states'],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
        undefined,
        zod.object({
            name: zod.string(),
            icon: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
        }),
    )
    @tag('state')
    @describe(
        'Creates a state',
        'This will insert the specified state into the system and return the newly appointed ID',
    )
    private async createStateHandler(req: Request, res: Response, _: undefined, body: PostStateBody) {
        const outgoingMessage: CreateStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            color: body.color,
            icon: body.icon,
            name: body.name,
        };

        await this.send(
            ROUTING_KEY.states.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['states', {
            key: 'id',
            description: 'The unique ID for this state',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
    )
    @tag('state')
    @describe(
        'Deletes a state',
        'This will remove a state from the system provided it is not a required dependency of any other object.',
    )
    private async deleteStateHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'state',
            }, this.resolver, this.handler, res);

            // TODO: On fail?
            if (this.config) await this.config.removeReviewState(req.params.id);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.PATCH,
        ['states', {
            key: 'id',
            description: 'The unique ID for this state',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
        undefined,
        zod.object({
            name: zod.string()
                .optional(),
            icon: zod.string()
                .optional(),
            color: zod.string()
                .regex(COLOR_REGEX)
                .optional(),
        }),
    )
    @tag('state')
    @describe(
        'Update the properties of a state',
        'The values provided in the body will be updated in the state',
    )
    private async updateStateHandler(req: Request, res: Response, _: undefined, body: PatchStateBody) {
        const outgoing: UpdateStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined(['name', 'icon', 'color'], body, outgoing);

        await this.send(
            ROUTING_KEY.states.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['states', 'review'],
        ['StateList', zod.array(ZState)],
        ['ops', 'admin'],
    )
    @tag('state')
    @describe(
        'Get review states',
        'This will return the list of states that have been marked as requiring manual review when '
        + 'assigned to events',
    )
    private async getReviewStates(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.config) {
            try {
                const states = await this.config.getReviewStates();
                res.status(constants.HTTP_STATUS_OK)
                    .json(MessageUtilities.wrapInSuccess(states));
            } catch (e) {
                console.error(e);
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }
}
