import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EntStateMessage, StateMessage, StateResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import ReadStateMessage = StateMessage.ReadStateMessage;
import CreateStateMessage = StateMessage.CreateStateMessage;
import UpdateStateMessage = StateMessage.UpdateStateMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import * as zod from 'zod';
import sendZodError = MessageUtilities.sendZodError;
import { Configuration } from '../../configuration/Configuration';

export class StateGatewayInterface implements GatewayAttachmentInterface {
    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    private resolver?: EntityResolver;

    private handler?: GatewayMessageHandler;

    private config?: Configuration;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
        config: Configuration,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new StateResponseValidator();
        this.resolver = resolver;
        this.handler = handler;
        this.config = config;

        return [
            {
                action: 'get',
                path: '/states',
                handle: this.queryStatesHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/states',
                handle: this.createStateHandler(send),
                additionalValidator: validator,
                secure: ['ops', 'admin'],
            },
            {
                action: 'delete',
                path: '/states/:id',
                handle: this.deleteStateHandler(send),
                additionalValidator: validator,
                secure: ['ops', 'admin'],
            },
            {
                action: 'get',
                path: '/states/:id',
                handle: this.getStateHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/states/:id',
                handle: this.updateStateHandler(send),
                additionalValidator: validator,
                secure: ['ops', 'admin'],
            },
        ];
    }

    private queryStatesHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadStateMessage = {
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
                        validator: (x) => this.COLOR_REGEX.test(x)
                    },
                    id: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

            const parameters = req.query;
            const validProperties: (keyof ReadEntStateMessage)[] = [
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
                ROUTING_KEY.states.read,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            await send(
                ROUTING_KEY.states.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = zod.object({
                name: zod.string(),
                icon: zod.string(),
                color: zod.string()
                    .regex(this.COLOR_REGEX),
            })
                .safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }
            const body = req.body;

            const outgoingMessage: CreateStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                color: body.color,
                icon: body.icon,
                name: body.name,
            };

            await send(
                ROUTING_KEY.states.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'state',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: UpdateStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            const validate = zod.object({
                name: zod.string()
                    .optional(),
                icon: zod.string()
                    .optional(),
                color: zod.string()
                    .regex(this.COLOR_REGEX)
                    .optional(),
            })
                .safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }

            const parameters = req.body;
            const validProperties: (keyof ReadEntStateMessage)[] = [
                'name',
                'icon',
                'color',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.states.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
