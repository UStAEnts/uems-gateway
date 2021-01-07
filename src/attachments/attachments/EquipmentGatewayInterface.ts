import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EquipmentMessage, EquipmentResponseValidator, MessageIntention } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadEquipmentMessage = EquipmentMessage.ReadEquipmentMessage;
import CreateEquipmentMessage = EquipmentMessage.CreateEquipmentMessage;
import DeleteEquipmentMessage = EquipmentMessage.DeleteEquipmentMessage;
import UpdateEquipmentMessage = EquipmentMessage.UpdateEquipmentMessage;
import { Resolver } from "../Resolvers";
import { EntityResolver } from "../../resolver/EntityResolver";

export class EquipmentGatewayInterface implements GatewayAttachmentInterface {
    private readonly EQUIPMENT_CREATE_KEY = 'equipment.details.create';

    private readonly EQUIPMENT_DELETE_KEY = 'equipment.details.delete';

    private readonly EQUIPMENT_UPDATE_KEY = 'equipment.details.update';

    public static readonly EQUIPMENT_READ_KEY = 'equipment.details.get';

    private resolver?: EntityResolver;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this.resolver = resolver;

        const validator = new EquipmentResponseValidator();

        return [
            {
                action: 'get',
                path: '/equipment',
                handle: this.queryEventsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/equipment',
                handle: this.createEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/equipment/:id',
                handle: this.deleteEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/equipment/:id',
                handle: this.getEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/equipment/:id',
                handle: this.updateEventHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private queryEventsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadEquipmentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
            };

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
                EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEquipments(this.resolver)),
            );
        };
    }

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadEquipmentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
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
                EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleEquipment(this.resolver)),
            );
        };
    }

    private createEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = MessageUtilities.verifyParameters(
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
                userID: req.uemsJWT.userID,
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
                this.EQUIPMENT_CREATE_KEY,
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

            const outgoingMessage: DeleteEquipmentMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsJWT.userID,
                id: req.params.id,
            };

            await send(
                this.EQUIPMENT_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private updateEventHandler(send: SendRequestFunction) {
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
                userID: req.uemsJWT.userID,
                id: req.params.id,
            };

            // Then validate the body parameters and copy them over
            const validate = MessageUtilities.verifyParameters(
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
                this.EQUIPMENT_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
