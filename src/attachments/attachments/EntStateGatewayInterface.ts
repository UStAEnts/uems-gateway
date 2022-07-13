import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EntStateMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { EntityResolver } from '../../resolver/EntityResolver';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { copyKeysIfDefined, describe, endpoint, Method, tag } from '../../decorators/endpoint';
import { EntStateValidators } from '@uems/uemscommlib/build/ent/EntStateValidators';
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import ZEntState = EntStateValidators.ZEntState;
import Attachment = GatewayMk2.Attachment;
import { Configuration } from "../../configuration/Configuration";

type QueryQueryType = {
    id?: string,
    name?: string,
    color?: string,
    icon?: string,
};

type CreateBodyType = {
    name: string,
    icon: string,
    color: string,
};

type UpdateBodyType = {
    name?: string,
    icon?: string,
    color?: string,
};

const COLOR_REGEX = /^#?([\dA-Fa-f]{3}([\dA-Fa-f]{3})?)$/;

export class EntStateGatewayInterface extends Attachment {
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
        ['ents'],
        ['EntStateList', zod.array(ZEntState)],
        undefined,
        zod.object({
            id: zod.string(),
            name: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
            icon: zod.string(),
        }).partial(),
    )
    @tag('ents')
    @describe(
        'Queries ent state',
        'Supports querying a set of ents states based on a range of properties',
    )
    private async queryEntStatesHandler(req: Request, res: Response, query: QueryQueryType, _: undefined) {
        const outgoing: ReadEntStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        copyKeysIfDefined(['id', 'name', 'color', 'icon'], query, outgoing);

        await this.send(
            ROUTING_KEY.ent.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['ents', {
            key: 'id',
            description: 'The unique ID of this ent state',
        }],
        ['EntState', ZEntState],
    )
    @tag('ents')
    @describe(
        'Retrieve a single ent state',
        'Returns a single ent state record based on its unique ID',
    )
    private async getEntStateHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadEntStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        await this.send(
            ROUTING_KEY.ent.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['ents'],
        ['ModifyResponse', zod.array(zod.string())],
        ['ents', 'admin', 'ops'],
        undefined,
        zod.object({
            name: zod.string(),
            icon: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
        }),
    )
    @tag('ents')
    @describe(
        'Create a new ent state',
        'Creates a new ent state and returns its identifier based on the body provided',
    )
    private async createEntStateHandler(req: Request, res: Response, _: undefined, body: CreateBodyType) {
        const outgoingMessage: CreateEntStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            color: body.color,
            icon: body.icon,
            name: body.name,
        };

        await this.send(
            ROUTING_KEY.ent.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['ents', {
            key: 'id',
            description: 'The unique ID for the ent state',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ents', 'admin', 'ops'],
    )
    @tag('ents')
    @describe(
        'Delete an ents state',
        'Deletes an ent state from the system provided there are no other objects depending on this object',
    )
    private async deleteEntStateHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'ent',
            }, this.resolver, this.handler, res);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.PATCH,
        ['ents', {
            key: 'id',
            description: 'The unique ID for this ent state',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ents', 'admin', 'ops'],
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
    @tag('ents')
    @describe(
        'Updates an ent state',
        'Updates the properties of an ents state with the modifications specified in the body',
    )
    private async updateEntStateHandler(req: Request, res: Response, _: undefined, body: UpdateBodyType) {
        const outgoing: UpdateEntStateMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined(['name', 'icon', 'color'], body, outgoing);

        await this.send(
            ROUTING_KEY.ent.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
