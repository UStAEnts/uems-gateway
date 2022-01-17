import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { TopicMessage, TopicResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import TopicReadSchema = TopicMessage.ReadTopicMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import * as zod from 'zod';
import sendZodError = MessageUtilities.sendZodError;

export class TopicGatewayInterface implements GatewayAttachmentInterface {

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;
    private resolver?: EntityResolver;
    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new TopicResponseValidator();
        this.resolver = resolver;
        this.handler = handler;

        return [
            {
                action: 'get',
                path: '/topics',
                handle: this.queryTopicsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/topics',
                handle: this.createTopicHandler(send),
                additionalValidator: validator,
                secure: ['admin', 'ops'],
            },
            {
                action: 'delete',
                path: '/topics/:id',
                handle: this.deleteTopicHandler(send),
                additionalValidator: validator,
                secure: ['admin', 'ops'],
            },
            {
                action: 'get',
                path: '/topics/:id',
                handle: this.getTopicHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/topics/:id',
                handle: this.updateTopicHandler(send),
                additionalValidator: validator,
                secure: ['admin', 'ops'],
            },
        ];
    }

    private queryTopicsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            const validate = MessageUtilities.coerceAndVerifyQuery(
                req,
                res,
                [],
                {
                    name: { primitive: 'string' },
                    icon: { primitive: 'string' },
                    color: {
                        primitive: 'string',
                        validator: this.COLOR_REGEX.test
                    },
                    description: { primitive: 'string' },
                    id: { primitive: 'string' },
                }
            );

            if (!validate) {
                return;
            }

            const parameters = req.query;
            const validProperties: (keyof TopicReadSchema)[] = [
                'name',
                'icon',
                'color',
                'id',
                'description',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.topic.read,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            await send(
                ROUTING_KEY.topic.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = zod.object({
                name: zod.string(),
                icon: zod.string(),
                color: zod.string()
                    .regex(this.COLOR_REGEX),
                description: zod.string(),
            })
                .safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }

            const body = validate.data;

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

            await send(
                ROUTING_KEY.topic.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'topic',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = zod.object({
                name: zod.string()
                    .optional(),
                icon: zod.string()
                    .optional(),
                color: zod.string()
                    .regex(this.COLOR_REGEX)
                    .optional(),
                description: zod.string()
                    .optional(),
            })
                .safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }

            const outgoing: UpdateTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            const parameters = req.body;
            const validProperties: (keyof TopicReadSchema)[] = [
                'name',
                'icon',
                'color',
                'description',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.topic.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
