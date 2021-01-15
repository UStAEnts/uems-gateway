import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EntStateMessage, EntStateResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import EntStateReadSchema = EntStateMessage.ReadEntStateMessage;
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;

export class EntStateGatewayInterface implements GatewayAttachmentInterface {
    private readonly ENT_STATE_CREATE_KEY = 'ents.details.create';

    private readonly ENT_STATE_DELETE_KEY = 'ents.details.delete';

    private readonly ENT_STATE_UPDATE_KEY = 'ents.details.update';

    public static readonly ENT_STATE_READ_KEY = 'ents.details.get';

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new EntStateResponseValidator();

        return [
            {
                action: 'get',
                path: '/ents',
                handle: this.queryEntStatesHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/ents',
                handle: this.createEntStateHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/ents/:id',
                handle: this.deleteEntStateHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/ents/:id',
                handle: this.getEntStateHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/ents/:id',
                handle: this.updateEntStateHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private queryEntStatesHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadEntStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            const parameters = req.query;
            const validProperties: (keyof EntStateReadSchema)[] = [
                'name',
                'icon',
                'color',
                'id',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                EntStateGatewayInterface.ENT_STATE_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEntStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadEntStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
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
                EntStateGatewayInterface.ENT_STATE_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createEntStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['name', 'icon', 'color'],
                {
                    name: (x) => typeof (x) === 'string',
                    icon: (x) => typeof (x) === 'string',
                    color: (x) => typeof (x) === 'string' && this.COLOR_REGEX.test(x),
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateEntStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                color: req.body.color,
                icon: req.body.icon,
                name: req.body.name,
            };

            await send(
                this.ENT_STATE_CREATE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteEntStateHandler(send: SendRequestFunction) {
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

            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                id: req.params.id,
            };

            await send(
                this.ENT_STATE_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private updateEntStateHandler(send: SendRequestFunction) {
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

            const parameters = req.body;
            const validProperties: (keyof UpdateEntStateMessage)[] = [
                'name',
                'icon',
                'color',
            ];

            const outgoing: UpdateEntStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                this.ENT_STATE_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
