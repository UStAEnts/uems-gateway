import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { MessageIntention, UserMessage, UserResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadUserMessage = UserMessage.ReadUserMessage;
import CreateUserMessage = UserMessage.CreateUserMessage;
import DeleteUserMessage = UserMessage.DeleteUserMessage;
import UpdateUserMessage = UserMessage.UpdateUserMessage;

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

    private queryEventsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
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
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                UserGatewayInterface.USER_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventHandler(send: SendRequestFunction) {
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

            const outgoingMessage: ReadUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
            };

            await send(
                UserGatewayInterface.USER_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['name', 'username', 'email', 'hash'],
                {
                    name: (x) => typeof (x) === 'string',
                    username: (x) => typeof (x) === 'string',
                    email: (x) => typeof (x) === 'string',
                    hash: (x) => typeof (x) === 'string',
                    profile: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsJWT.userID,
                name: req.body.name,
                username: req.body.username,
                email: req.body.email,
                hash: req.body.hash,
            };

            if (req.body.profile) outgoingMessage.profile = req.body.profile;

            await send(
                this.USER_CREATE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteEventHandler(send: SendRequestFunction) {
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

            const outgoingMessage: DeleteUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsJWT.userID,
                id: req.params.id,
            };

            await send(
                this.USER_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private updateEventHandler(send: SendRequestFunction) {
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

            const outgoing: UpdateUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsJWT.userID,
                id: req.params.id,
            };

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
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                this.USER_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
