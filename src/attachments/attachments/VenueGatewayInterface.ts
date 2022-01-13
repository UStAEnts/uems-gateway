import { Request, Response } from 'express';
import { GatewayMk2 } from '../../Gateway';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { VenueMessage, VenueResponseValidator } from '@uems/uemscommlib';
import { EntityResolver } from '../../resolver/EntityResolver';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import ReadVenueMessage = VenueMessage.ReadVenueMessage;
import CreateVenueMessage = VenueMessage.CreateVenueMessage;
import UpdateVenueMessage = VenueMessage.UpdateVenueMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;

export class VenueGatewayInterface implements GatewayAttachmentInterface {

    private readonly COLOR_REGEX = /^#?([0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?)$/;

    private resolver!: EntityResolver;
    private handler?: GatewayMessageHandler;

    public generateInterfaces(
        sendRequest: SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayInterfaceActionType[] {
        this.resolver = resolver;
        this.handler = handler;

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
                secure: ['admin', 'ops'],
            },
            {
                action: 'delete',
                path: '/venues/:id',
                handle: this.handleDeleteRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
                secure: ['admin', 'ops'],
            },
            {
                action: 'patch',
                path: '/venues/:id',
                handle: this.handleUpdateRequest(sendRequest),
                additionalValidator: new VenueResponseValidator(),
                secure: ['admin', 'ops'],
            },
        ];
    }

    private handleGetRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const outgoingMessage: ReadVenueMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: request.uemsUser.userID,
                id: request.params.id,
            };

            sendRequest(
                ROUTING_KEY.venues.read,
                outgoingMessage,
                response,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleVenue(
                    this.resolver,
                    request.uemsUser.userID,
                )),
            );
        };
    }

    private handleDeleteRequest(sendRequest: SendRequestFunction) {
        return async (request: Request, response: Response) => {
            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: request.params.id,
                    assetType: 'venue',
                }, this.resolver, this.handler, response);
            } else {
                response.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private handleCreateRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const validate = MessageUtilities.verifyBody(
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

            // @ts-ignore
            const outgoingMessage: CreateVenueMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: request.uemsUser.userID,
                name: request.body.name,
                capacity: request.body.capacity,
                color: request.body.color,
            };

            sendRequest(
                ROUTING_KEY.venues.create,
                outgoingMessage,
                response,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private handleReadRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const parameters = request.query;
            const validProperties = [
                'name',
                'capacity',
                'approximate_capacity',
                'approximate_fuzziness',
                'minimum_capacity',
                'maximum_capacity',
            ];

            const validate = MessageUtilities.coerceAndVerifyQuery(
                request,
                response,
                [],
                {
                    approximate_capacity: { primitive: 'number' },
                    approximate_fuzziness: { primitive: 'number' },
                    capacity: { primitive: 'number' },
                    maximum_capacity: { primitive: 'number' },
                    minimum_capacity: { primitive: 'number' },
                    name: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: ReadVenueMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: request.uemsUser.userID,
            };

            // Copy any of the search properties into the request if they are present
            // There's no real point in validating this here because it will be done
            // at the venue microservice and that should have less load than the gateway
            // This may need to be reconsidered in the future
            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoingMessage[key] = parameters[key];
                }
            });

            sendRequest(
                ROUTING_KEY.venues.read,
                outgoingMessage,
                response,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveVenues(
                    this.resolver,
                    request.uemsUser.userID,
                )),
            );
        };
    }

    private handleUpdateRequest(sendRequest: SendRequestFunction) {
        return (request: Request, response: Response) => {
            const validate = MessageUtilities.verifyBody(
                request,
                response,
                [],
                {
                    name: (x) => typeof (x) === 'string',
                    capacity: (x) => typeof (x) === 'number',
                    color: (x) => typeof (x) === 'string' && this.COLOR_REGEX.test(x),
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: UpdateVenueMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: request.uemsUser.userID,
                id: request.params.id,
            };

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
                    // @ts-ignore
                    outgoingMessage[key] = parameters[key];
                }
            });

            console.log(outgoingMessage);

            sendRequest(
                ROUTING_KEY.venues.update,
                outgoingMessage,
                response,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
