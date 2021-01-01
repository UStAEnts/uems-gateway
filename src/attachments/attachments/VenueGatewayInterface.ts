import { Request, Response } from 'express';
import { GatewayMk2 } from '../../Gateway';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { constants } from 'http2';
import { MessageIntention, MsgStatus, VenueResponse, VenueResponseValidator } from '@uems/uemscommlib';
import { EntityResolver } from "../../resolver/EntityResolver";
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import VenueReadResponseMessage = VenueResponse.VenueReadResponseMessage;

export class VenueGatewayInterface implements GatewayAttachmentInterface {
    private readonly VENUE_CREATE_KEY = 'venues.create';

    private readonly VENUE_DELETE_KEY = 'venues.delete';

    private readonly VENUE_UPDATE_KEY = 'venues.update';

    public static readonly VENUE_READ_KEY = 'venues.get';

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    private resolver: EntityResolver | undefined;

    public generateInterfaces(sendRequest: SendRequestFunction, resolver: EntityResolver): GatewayInterfaceActionType[] {
        this.resolver = resolver;

        return [
            {
                action: 'get',
                path: '/venues',
                handle: this.handleReadRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
            },
            {
                action: 'get',
                path: '/venues/:id',
                handle: this.handleGetRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
            },
            {
                action: 'post',
                path: '/venues',
                handle: this.handleCreateRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
            },
            {
                action: 'delete',
                path: '/venues/:id',
                handle: this.handleDeleteRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
            },
            {
                action: 'patch',
                path: '/venues/:id',
                handle: this.handleUpdateRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
            },
        ];
    }

    private handleGetResponse = (http: Response, timestamp: number, raw: MinimalMessageType, status: number) => {
        if (this.resolver === undefined) throw new Error('resolver was undefined');

        // This message is handled
        MessageUtilities.identifierConsumed(raw.msg_id);

        // The response is validated to be a valid response type by the additionalValidator property
        const response = raw as VenueReadResponseMessage;

        this.resolver.resolveUserSet(response.result)
            .then(() => {
                if (status === MsgStatus.SUCCESS) {
                    if (response.result.length !== 1) {
                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                        return;
                    }

                    http.status(constants.HTTP_STATUS_OK)
                        .json(MessageUtilities.wrapInSuccess(response.result[0]));
                } else {
                    http
                        .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                }
            })
            .catch((err) => {
                console.error('Failed to resolve users for venues', err);
                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            });
    };

    private handleGetRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.READ,
                status: 0,
            };

            if (!MessageUtilities.has(request.params, 'id')) {
                response
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            outgoingMessage.id = request.params.id;

            sendRequest(VenueGatewayInterface.VENUE_READ_KEY, outgoingMessage, response, this.handleGetResponse);
        };
    }

    private handleDeleteRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.DELETE,
                status: 0,
            };

            if (!MessageUtilities.has(request.params, 'id')) {
                response
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            outgoingMessage.id = request.params.id;

            sendRequest(this.VENUE_DELETE_KEY, outgoingMessage, response, this.handleReadResponse);
        };
    }

    private handleCreateRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.CREATE,
                status: 0,
            };

            const validate = MessageUtilities.verifyParameters(
                request,
                response,
                ['name', 'capacity', 'color'],
                {
                    name: (x) => typeof (x) === 'string',
                    capacity: (x) => typeof (x) === 'number',
                    color: (x) => typeof (x) === 'string' && this.COLOR_REGEX.test(x),
                },
            );

            if (!validate) {
                return;
            }

            const parameters = request.body;
            const validProperties = [
                'name',
                'capacity',
                'color',
            ];

            // Copy any of the search properties into the request if they are present
            // There's no real point in validating this here because it will be done
            // at the venue microservice and that should have less load than the gateway
            // This may need to be reconsidered in the future
            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoingMessage[key] = parameters[key];
                }
            });

            sendRequest(this.VENUE_CREATE_KEY, outgoingMessage, response, this.handleReadResponse);
        };
    }

    /**
     * Handles the incoming message from the venue microservice, returning them to the response
     * @param http the cached response from the http server
     * @param timestamp the timestamp at which the request was received
     * @param raw the raw response
     * @param status the status of the response (the message response)
     * @private
     */
    private handleReadResponse = (http: Response, timestamp: number, raw: MinimalMessageType, status: number) => {
        if (this.resolver === undefined) throw new Error('resolver was undefined');

        // This message is handled
        MessageUtilities.identifierConsumed(raw.msg_id);

        // The response is validated to be a valid response type by the additionalValidator property
        const response = raw as VenueReadResponseMessage;

        this.resolver.resolveUserSet(response.result)
            .then(() => {
                if (status === MsgStatus.SUCCESS) {
                    http.status(constants.HTTP_STATUS_OK)
                        .json(MessageUtilities.wrapInSuccess(response.result));
                } else {
                    http
                        .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                }
            })
            .catch((err) => {
                console.error('Failed to resolve users for venues', err);
                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            });
    };

    private handleReadRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.READ,
                status: 0,
            };

            const parameters = request.query;
            const validProperties = [
                'name',
                'capacity',
                'approximate_capacity',
                'approximate_fuzziness',
                'minimum_capacity',
                'maximum_capacity',
            ];

            // Copy any of the search properties into the request if they are present
            // There's no real point in validating this here because it will be done
            // at the venue microservice and that should have less load than the gateway
            // This may need to be reconsidered in the future
            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoingMessage[key] = parameters[key];
                }
            });

            // TODO(vitineth@gmail.com): verify why status is a non-primitive number
            return sendRequest(
                VenueGatewayInterface.VENUE_READ_KEY,
                outgoingMessage,
                response,
                this.handleReadResponse,
            );
        };
    }

    private handleUpdateRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: any = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: MessageIntention.UPDATE,
                status: 0,
            };

            if (!MessageUtilities.has(request.params, 'id')) {
                response
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            outgoingMessage.id = request.params.id;

            const parameters = request.body;
            const validProperties = [
                'name',
                'capacity',
                'color',
            ];

            // Copy any of the search properties into the request if they are present
            // There's no real point in validating this here because it will be done
            // at the venue microservice and that should have less load than the gateway
            // This may need to be reconsidered in the future
            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    outgoingMessage[key] = parameters[key];
                }
            });

            console.log(outgoingMessage);

            // @ts-ignore - the definition uses number for some reason so the type doesn't match here
            // this shouldn't cause any noticable difference
            // TODO(vitineth@gmail.com): verify why status is a non-primitive number
            return sendRequest(this.VENUE_UPDATE_KEY, outgoingMessage, response, this.handleReadResponse);
        };
    }
}
