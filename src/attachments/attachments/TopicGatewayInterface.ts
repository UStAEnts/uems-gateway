import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { TopicResponse, MsgStatus, TopicResponseValidator, TopicMessage } from '@uems/uemscommlib';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import TopicReadSchema = TopicMessage.ReadTopicMessage;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import TopicResponseMessage = TopicResponse.TopicResponseMessage;
import { GenericHandlerFunctions } from "../GenericHandlerFunctions";
import ReadTopicMessage = TopicMessage.ReadTopicMessage;
import CreateTopicMessage = TopicMessage.CreateTopicMessage;
import DeleteTopicMessage = TopicMessage.DeleteTopicMessage;
import UpdateTopicMessage = TopicMessage.UpdateTopicMessage;

export class TopicGatewayInterface implements GatewayAttachmentInterface {
    private readonly TOPIC_CREATE_KEY = 'topics.details.create';

    private readonly TOPIC_DELETE_KEY = 'topics.details.delete';

    private readonly TOPIC_UPDATE_KEY = 'topics.details.update';

    public static readonly TOPIC_READ_KEY = 'topics.details.get';

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new TopicResponseValidator();

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
            },
            {
                action: 'delete',
                path: '/topics/:id',
                handle: this.deleteTopicHandler(send),
                additionalValidator: validator,
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
                TopicGatewayInterface.TOPIC_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoingMessage: ReadTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            await send(
                TopicGatewayInterface.TOPIC_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = MessageUtilities.verifyBody(
                req,
                res,
                ['name', 'icon', 'color', 'description'],
                {
                    name: (x) => typeof (x) === 'string',
                    icon: (x) => typeof (x) === 'string',
                    color: (x) => typeof (x) === 'string' && this.COLOR_REGEX.test(x),
                    description: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                name: req.body.name,
                color: req.body.color,
                icon: req.body.icon,
                description: req.body.description,
            };

            await send(
                this.TOPIC_CREATE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoingMessage: DeleteTopicMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            await send(
                this.TOPIC_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private updateTopicHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
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
                this.TOPIC_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
