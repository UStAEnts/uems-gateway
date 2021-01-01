import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { MsgIntention } from '@uems/uemscommlib/build/messaging/types/event_message_schema';
import { MsgStatus } from '@uems/uemscommlib/build/messaging/types/event_response_schema';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { UserResponse } from '@uems/uemscommlib';
import { EquipmentValidators } from '@uems/uemscommlib/build/equipment/EquipmentValidators';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import UserResponseMessage = UserResponse.UserResponseMessage;
import EquipmentResponseValidator = EquipmentValidators.EquipmentResponseValidator;

export class EquipmentGatewayInterface implements GatewayAttachmentInterface {
    private readonly EQUIPMENT_CREATE_KEY = 'equipment.details.create';

    private readonly EQUIPMENT_DELETE_KEY = 'equipment.details.delete';

    private readonly EQUIPMENT_UPDATE_KEY = 'equipment.details.update';

    public static readonly EQUIPMENT_READ_KEY = 'equipment.details.get';

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
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
                msg_intention: MsgIntention.READ,
                status: 0,
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
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
                outgoing,
                res,
                EquipmentGatewayInterface.handleDefaultResponse,
            );
        };
    }

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MsgIntention.READ,
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
                EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
                outgoingMessage,
                res,
                EquipmentGatewayInterface.handleReadSingleResponse,
            );
        };
    }

    private createEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MsgIntention.CREATE,
                status: 0,
            };

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
                'name',
                'manufacturer',
                'model',
                'amount',
                'locationID',
                'category',
                'assetID',
                'miscIdentifier',
                'locationSpecifier',
            ];

            for (const key of copy) {
                if (req.body[key]) {
                    outgoingMessage[key] = req.body[key];
                }
            }

            await send(
                this.EQUIPMENT_CREATE_KEY,
                outgoingMessage,
                res,
                EquipmentGatewayInterface.handleDefaultResponse,
            );
        };
    }

    private deleteEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MsgIntention.DELETE,
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
                this.EQUIPMENT_DELETE_KEY,
                outgoingMessage,
                res,
                EquipmentGatewayInterface.handleReadSingleResponse,
            );
        };
    }

    private updateEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MsgIntention.UPDATE,
                status: 0,
            };

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

            outgoing.id = req.params.id;

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
                    outgoing[key] = req.body[key];
                }
            }

            await send(
                this.EQUIPMENT_UPDATE_KEY,
                outgoing,
                res,
                EquipmentGatewayInterface.handleDefaultResponse,
            );
        };
    }
}
