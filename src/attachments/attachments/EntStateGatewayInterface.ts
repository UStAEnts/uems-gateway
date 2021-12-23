import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EntStateMessage, EntStateResponseValidator, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import EntStateReadSchema = EntStateMessage.ReadEntStateMessage;
import ReadEntStateMessage = EntStateMessage.ReadEntStateMessage;
import CreateEntStateMessage = EntStateMessage.CreateEntStateMessage;
import UpdateEntStateMessage = EntStateMessage.UpdateEntStateMessage;
import { Constants } from "../../utilities/Constants";
import ROUTING_KEY = Constants.ROUTING_KEY;
import { removeAndReply, removeEntity } from "../DeletePipelines";
import { EntityResolver } from "../../resolver/EntityResolver";
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { ErrorCodes } from "../../constants/ErrorCodes";

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
                secure: ['admin', 'ops'],
            },
            {
                action: 'delete',
                path: '/ents/:id',
                handle: this.deleteEntStateHandler(send, resolver, handler),
                additionalValidator: validator,
                secure: ['admin', 'ops'],
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
                secure: ['admin', 'ops'],
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
                        validator: (x) => this.COLOR_REGEX.test(x)
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
                ROUTING_KEY.ent.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private createEntStateHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = MessageUtilities.verifyBody(
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
                ROUTING_KEY.ent.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteEntStateHandler(send: GatewayMk2.SendRequestFunction, resolver: EntityResolver, handler: GatewayMessageHandler) {
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


            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'ent',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
            //
            // const outgoingMessage: any = {
            //     msg_id: MessageUtilities.generateMessageIdentifier(),
            //     msg_intention: 'DELETE',
            //     status: 0,
            //     id: req.params.id,
            // };
            //
            // await send(
            //     ROUTING_KEY.ent.delete,
            //     outgoingMessage,
            //     res,
            //     GenericHandlerFunctions.handleReadSingleResponseFactory(),
            // );
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

            const validate = MessageUtilities.verifyBody(
                req,
                res,
                [],
                {
                    name: (x) => typeof (x) === 'string',
                    icon: (x) => typeof (x) === 'string',
                    color: (x) => typeof (x) === 'string' && this.COLOR_REGEX.test(x),
                },
            );

            if (!validate) {
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
                ROUTING_KEY.ent.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
