import { GatewayMk2 } from '../../Gateway';
import { EntStateValidators } from '@uems/uemscommlib/build/ent/EntStateValidators';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { MsgIntention } from '@uems/uemscommlib/build/messaging/types/event_message_schema';
import { EntStateResponse } from '@uems/uemscommlib';
import { MsgStatus } from '@uems/uemscommlib/build/messaging/types/event_response_schema';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { StateValidators } from "@uems/uemscommlib/build/state/StateValidators";
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import EntStateReadSchema = EntStateValidators.EntStateReadSchema;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import EntStateResponseMessage = EntStateResponse.EntStateResponseMessage;
import StateResponseValidator = StateValidators.StateResponseValidator;

export class StateGatewayInterface implements GatewayAttachmentInterface {
    private readonly STATE_CREATE_KEY = 'states.details.create';

    private readonly STATE_DELETE_KEY = 'states.details.delete';

    private readonly STATE_UPDATE_KEY = 'states.details.update';

    public static readonly STATE_READ_KEY = 'states.details.get';

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new StateResponseValidator();

        return [
            {
                action: 'get',
                path: '/states',
                handle: this.queryEventsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/states',
                handle: this.createEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/states/:id',
                handle: this.deleteEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/states/:id',
                handle: this.getEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/states/:id',
                handle: this.updateEventHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private static handleDefaultResponse(http: Response, timestamp: number, raw: MinimalMessageType, status: number) {
        MessageUtilities.identifierConsumed(raw.msg_id);
        const response = raw as EntStateResponseMessage;

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
        const response = raw as EntStateResponseMessage;

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
            const validProperties: (keyof EntStateReadSchema)[] = [
                'name',
                'icon',
                'color',
                'id',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                StateGatewayInterface.STATE_READ_KEY,
                outgoing,
                res,
                StateGatewayInterface.handleDefaultResponse,
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
                StateGatewayInterface.STATE_READ_KEY,
                outgoingMessage,
                res,
                StateGatewayInterface.handleReadSingleResponse,
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

            // If all are validated, then copy them over
            outgoingMessage.name = req.body.name;
            outgoingMessage.color = req.body.color;
            outgoingMessage.icon = req.body.icon;

            await send(
                this.STATE_CREATE_KEY,
                outgoingMessage,
                res,
                StateGatewayInterface.handleDefaultResponse,
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
                this.STATE_DELETE_KEY,
                outgoingMessage,
                res,
                StateGatewayInterface.handleReadSingleResponse,
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
            const validProperties: (keyof EntStateReadSchema)[] = [
                'name',
                'icon',
                'color',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoing[key] = parameters[key];
                }
            });

            console.log(parameters);
            console.log(outgoing);

            await send(
                this.STATE_UPDATE_KEY,
                outgoing,
                res,
                StateGatewayInterface.handleDefaultResponse,
            );
        };
    }
}
