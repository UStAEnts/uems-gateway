import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EntStateMessage, EntStateResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { EntityResolver } from '../../resolver/EntityResolver';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import EntStateReadSchema = EntStateMessage.ReadEntStateMessage;
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;

export class EntStateGatewayInterface implements GatewayAttachmentInterface {
    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    private resolver?: EntityResolver;

    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new EntStateResponseValidator();
        this.resolver = resolver;
        this.handler = handler;

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
                secure: ['ents', 'admin', 'ops'],
            },
            {
                action: 'delete',
                path: '/ents/:id',
                handle: this.deleteEntStateHandler(),
                additionalValidator: validator,
                secure: ['ents', 'admin', 'ops'],
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
                secure: ['ents', 'admin', 'ops'],
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

            const validate = MessageUtilities.coerceAndVerifyQuery(
                req,
                res,
                [],
                {
                    id: { primitive: 'string' },
                    name: { primitive: 'string' },
                    color: {
                        primitive: 'string',
                        validator: (x) => this.COLOR_REGEX.test(x),
                    },
                    icon: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

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
                ROUTING_KEY.ent.read,
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
                id: req.params.id,
            };

            await send(
                ROUTING_KEY.ent.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createEntStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const bodyValidate = zod.object({
                name: zod.string(),
                icon: zod.string(),
                color: zod.string()
                    .regex(this.COLOR_REGEX),
            })
                .safeParse(req.body);

            if (!bodyValidate.success) {
                // TODO: error handling?
                return;
            }

            const body = bodyValidate.data;

            const outgoingMessage: CreateEntStateMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                color: body.color,
                icon: body.icon,
                name: body.name,
            };

            await send(
                ROUTING_KEY.ent.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteEntStateHandler() {
        return async (req: Request, res: Response) => {
            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'ent',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateEntStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
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
                // TODO: error handling
                return;
            }

            const parameters = validate.data;
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
                ROUTING_KEY.ent.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
