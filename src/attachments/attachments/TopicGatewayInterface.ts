import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { TopicMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { Configuration } from '../../configuration/Configuration';
import { copyKeysIfDefined, describe, endpoint, Method, tag } from '../../decorators/endpoint';
import { TopicValidators } from '@uems/uemscommlib/build/topic/TopicValidators';
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import Attachment = GatewayMk2.Attachment;
import ZTopic = TopicValidators.ZTopic;

const COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

type QueryTopicQuery = {
    name?: string,
    icon?: string,
    color?: string,
    description?: string,
    id?: string,
};

type PostTopicBody = {
    name: string,
    icon: string,
    color: string
    description: string,
};

type PatchTopicBody = {
    name?: string,
    icon?: string,
    color?: string,
    description?: string,
};

export class TopicGatewayInterface extends Attachment {
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
        ['topics'],
        ['TopicList', zod.array(ZTopic)],
        undefined,
        zod.object({
            name: zod.string(),
            icon: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
            description: zod.string(),
            id: zod.string(),
        })
            .partial(),
    )
    @tag('topic')
    @describe(
        'Search topics',
        'This will return all topics matching the provided filters',
    )
    private async queryTopicsHandler(req: Request, res: Response, query: QueryTopicQuery, _: undefined) {
        const outgoing: ReadTopicMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        copyKeysIfDefined([
            'name', 'icon', 'color', 'id', 'description',
        ], query, outgoing);

        await this.send(
            ROUTING_KEY.topic.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['topics', {
            key: 'id',
            description: 'The unique ID for this topic',
        }],
        ['Topic', ZTopic],
    )
    @tag('topic')
    @describe(
        'Get a topic',
        'Returns all properties associated with the given topic',
    )
    private async getTopicHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadTopicMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        await this.send(
            ROUTING_KEY.topic.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(),
        );
    }

    @endpoint(
        Method.POST,
        ['topics'],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
        undefined,
        zod.object({
            name: zod.string(),
            icon: zod.string(),
            color: zod.string()
                .regex(COLOR_REGEX),
            description: zod.string(),
        }),
    )
    @tag('topic')
    @describe(
        'Create a new topic',
        'This will create a new topic with the specified details, returning the newly generated ID',
    )
    private async createTopicHandler(req: Request, res: Response, _: undefined, body: PostTopicBody) {
        const outgoingMessage: CreateTopicMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            name: body.name,
            color: body.color,
            icon: body.icon,
            description: body.description,
        };

        await this.send(
            ROUTING_KEY.topic.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['topics', {
            key: 'id',
            description: 'The unique ID for this topic',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
    )
    @tag('topic')
    @describe(
        'Delete a topic',
        'This will remove a topic provided there are no critical dependencies on it',
    )
    private async deleteTopicHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'topic',
            }, this.resolver, this.handler, res);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.PATCH,
        ['topics', {
            key: 'id',
            description: 'The unique ID for this topic',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
        undefined,
        zod.object({
            name: zod.string()
                .optional(),
            icon: zod.string()
                .optional(),
            color: zod.string()
                .regex(COLOR_REGEX)
                .optional(),
            description: zod.string()
                .optional(),
        }),
    )
    @tag('topic')
    @describe(
        'Update a topic',
        'This will update the specified properties against the provided topic',
    )
    private async updateTopicHandler(req: Request, res: Response, _: undefined, body: PatchTopicBody) {
        const outgoing: UpdateTopicMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined([
            'name', 'icon', 'color', 'description',
        ], body, outgoing);

        await this.send(
            ROUTING_KEY.topic.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
