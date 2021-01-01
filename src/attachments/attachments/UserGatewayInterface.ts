import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import { MessageIntention, MsgStatus, UserResponse, UserResponseValidator } from '@uems/uemscommlib';
import UserResponseMessage = UserResponse.UserResponseMessage;

export class UserGatewayInterface implements GatewayAttachmentInterface {
    private readonly USER_CREATE_KEY = 'user.details.create';

    private readonly USER_DELETE_KEY = 'user.details.delete';

    private readonly USER_UPDATE_KEY = 'user.details.update';

    public static readonly USER_READ_KEY = 'user.details.get';

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new UserResponseValidator();

        return [
            {
                action: 'get',
                path: '/user',
                handle: this.queryEventsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/user',
                handle: this.createEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/user/:id',
                handle: this.deleteEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/user/:id',
                handle: this.getEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/user/:id',
                handle: this.updateEventHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private static handleDefaultResponse(http: Response, timestamp: number, raw: MinimalMessageType, status: number) {
        MessageUtilities.identifierConsumed(raw.msg_id);
        const response = raw as UserResponseMessage;

        if (status === MsgStatus.SUCCESS) {
            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result));
        } else {
            http
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    private static handleReadSingleResponse(http: Response, time: number, raw: MinimalMessageType, status: number) {
        MessageUtilities.identifierConsumed(raw.msg_id);
        const response = raw as UserResponseMessage;

        if (status === MsgStatus.SUCCESS) {
            if (response.result.length !== 1) {
                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }

            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result[0]));
        } else {
            http
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    private queryEventsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.READ,
                status: 0,
            };

            const parameters = req.query;
            const validProperties: string[] = [
                'id',
                'name',
                'username',
                'email',
                'includeEmail',
                'includeHash',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                UserGatewayInterface.USER_READ_KEY,
                outgoing,
                res,
                UserGatewayInterface.handleDefaultResponse,
            );
        };
    }

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
            await send(
                UserGatewayInterface.USER_READ_KEY,
                outgoingMessage,
                res,
                UserGatewayInterface.handleReadSingleResponse,
            );
        };
    }

    private createEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.CREATE,
                status: 0,
            };

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['name', 'username', 'email', 'hash'],
                {
                    name: (x) => typeof (x) === 'string',
                    username: (x) => typeof (x) === 'string',
                    email: (x) => typeof (x) === 'string',
                    hash: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            // If all are validated, then copy them over
            outgoingMessage.name = req.body.name;
            outgoingMessage.username = req.body.username;
            outgoingMessage.email = req.body.email;
            outgoingMessage.hash = req.body.hash;
            if (req.body.profile) outgoingMessage.profile = req.body.profile;

            await send(
                this.USER_CREATE_KEY,
                outgoingMessage,
                res,
                UserGatewayInterface.handleDefaultResponse,
            );
        };
    }

    private deleteEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.DELETE,
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
            await send(
                this.USER_DELETE_KEY,
                outgoingMessage,
                res,
                UserGatewayInterface.handleReadSingleResponse,
            );
        };
    }

    private updateEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.UPDATE,
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

            outgoing.id = req.params.id;

            const parameters = req.body;
            const validProperties: string[] = [
                'name',
                'username',
                'email',
                'hash',
                'profile',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoing[key] = parameters[key];
                }
            });

            console.log(parameters);
            console.log(outgoing);

            await send(
                this.USER_UPDATE_KEY,
                outgoing,
                res,
                UserGatewayInterface.handleDefaultResponse,
            );
        };
    }
}
