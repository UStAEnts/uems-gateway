import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EquipmentMessage, EquipmentResponseValidator, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from "../Resolvers";
import { EntityResolver } from "../../resolver/EntityResolver";
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadEquipmentMessage = EquipmentMessage.ReadEquipmentMessage;
import CreateEquipmentMessage = EquipmentMessage.CreateEquipmentMessage;
import DeleteEquipmentMessage = EquipmentMessage.DeleteEquipmentMessage;
import UpdateEquipmentMessage = EquipmentMessage.UpdateEquipmentMessage;
import { Constants } from "../../utilities/Constants";
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { removeAndReply, removeEntity } from "../DeletePipelines";
import { ErrorCodes } from "../../constants/ErrorCodes";

export class EquipmentGatewayInterface implements GatewayAttachmentInterface {

    private resolver?: EntityResolver;
    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this.resolver = resolver;
        this.handler = handler;

        const validator = new EquipmentResponseValidator();

        return [
            {
                action: 'get',
                path: '/equipment',
                handle: this.queryEquipmentsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/equipment',
                handle: this.createEquipmentHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/equipment/:id',
                handle: this.deleteEquipmentHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/equipment/:id',
                handle: this.getEquipmentHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/equipment/:id',
                handle: this.updateEquipmentHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private queryEquipmentsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadEquipmentMessage = {
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
                    assetID: { primitive: 'string' },
                    name: { primitive: 'string' },
                    manufacturer: { primitive: 'string' },
                    model: { primitive: 'string' },
                    miscIdentifier: { primitive: 'string' },
                    amount: { primitive: 'number' },
                    locationID: { primitive: 'string' },
                    locationSpecifier: { primitive: 'string' },
                    managerID: { primitive: 'string' },
                    date: { primitive: 'number' },
                    category: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

            const parameters = req.query;
            const validProperties: string[] = [
                'id',
                'assetID',
                'name',
                'manufacturer',
                'model',
                'miscIdentifier',
                'amount',
                'locationID',
                'locationSpecifier',
                'managerID',
                'date',
                'category',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.equipment.read,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEquipments(
                    this.resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private getEquipmentHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadEquipmentMessage = {
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
                ROUTING_KEY.equipment.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleEquipment(
                    this.resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private createEquipmentHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = MessageUtilities.verifyBody(
                req,
                res,
                ['name', 'manufacturer', 'model', 'amount', 'locationID', 'category'],
                {
                    // Required
                    name: (x) => typeof (x) === 'string',
                    manufacturer: (x) => typeof (x) === 'string',
                    model: (x) => typeof (x) === 'string',
                    amount: (x) => typeof (x) === 'number',
                    locationID: (x) => typeof (x) === 'string',
                    category: (x) => typeof (x) === 'string',

                    // Optional
                    assetID: (x) => typeof (x) === 'string',
                    miscIdentifier: (x) => typeof (x) === 'string',
                    locationSpecifier: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const copy = [
                'assetID',
                'miscIdentifier',
                'locationSpecifier',
            ];

            const outgoingMessage: CreateEquipmentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                name: req.body.name,
                manufacturer: req.body.manufacturer,
                model: req.body.model,
                amount: req.body.amount,
                locationID: req.body.locationID,
                category: req.body.category,
            };

            for (const key of copy) {
                if (req.body[key]) {
                    // @ts-ignore
                    outgoingMessage[key] = req.body[key];
                }
            }

            await send(
                ROUTING_KEY.equipment.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteEquipmentHandler(send: SendRequestFunction) {
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
                    assetType: 'equipment',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
            //
            // const outgoingMessage: DeleteEquipmentMessage = {
            //     msg_id: MessageUtilities.generateMessageIdentifier(),
            //     msg_intention: 'DELETE',
            //     status: 0,
            //     userID: req.uemsUser.userID,
            //     id: req.params.id,
            // };
            //
            // await send(
            //     ROUTING_KEY.equipment.delete,
            //     outgoingMessage,
            //     res,
            //     GenericHandlerFunctions.handleReadSingleResponseFactory(),
            // );
        };
    }

    private updateEquipmentHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            // ID is carried in the parameter not the body so have to do it this way
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoing: UpdateEquipmentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            // Then validate the body parameters and copy them over
            const validate = MessageUtilities.verifyBody(
                req,
                res,
                [],
                {
                    // Optional
                    assetID: (x) => typeof (x) === 'string',
                    name: (x) => typeof (x) === 'string',
                    manufacturer: (x) => typeof (x) === 'string',
                    model: (x) => typeof (x) === 'string',
                    miscIdentifier: (x) => typeof (x) === 'string',
                    amount: (x) => typeof (x) === 'number',
                    locationID: (x) => typeof (x) === 'string',
                    locationSpecifier: (x) => typeof (x) === 'string',
                    managerID: (x) => typeof (x) === 'string',
                    category: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const copy = [
                'assetID',
                'name',
                'manufacturer',
                'model',
                'miscIdentifier',
                'amount',
                'locationID',
                'locationSpecifier',
                'managerID',
                'category',
            ];

            for (const key of copy) {
                if (req.body[key]) {
                    // @ts-ignore
                    outgoing[key] = req.body[key];
                }
            }

            await send(
                ROUTING_KEY.equipment.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
