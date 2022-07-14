import { Request, Response } from 'express';
import { GatewayMk2 } from '../../Gateway';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { VenueMessage } from '@uems/uemscommlib';
import { EntityResolver } from '../../resolver/EntityResolver';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { Configuration } from '../../configuration/Configuration';
import { asNumber, copyKeysIfDefined, describe, endpoint, Method, tag, warn } from '../../decorators/endpoint';
import { VenueValidators } from '@uems/uemscommlib/build/venues/VenueValidators';
import ReadVenueMessage = VenueMessage.ReadVenueMessage;
import CreateVenueMessage = VenueMessage.CreateVenueMessage;
import UpdateVenueMessage = VenueMessage.UpdateVenueMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import Attachment = GatewayMk2.Attachment;
import ZVenue = VenueValidators.ZVenue;

const COLOR_REGEX = /^#?([\dA-Fa-f]{3}([\dA-Fa-f]{3})?)$/;

type PostVenueBody = {
    name: string,
    capacity: number,
    color: string,
};

type GetVenueQuery = {
    capacity?: number,
    capacityGreater?: number,
    capacityLess?: number,
    name?: string,
};

type PatchVenueBody = {
    name?: string,
    capacity?: number,
    color?: string,
};

export class VenueGatewayInterface extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.GET,
        ['venues', {
            key: 'id',
            description: 'The unique identifier for this venue',
        }],
        ['Venue', ZVenue],
    )
    @tag('venue')
    @describe(
        'Get a venue',
        'Get the properties of a single venue by ID',
    )
    public async handleGetRequest(request: Request, response: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadVenueMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: request.uemsUser.userID,
            id: request.params.id,
        };

        await this.send(
            ROUTING_KEY.venues.read,
            outgoingMessage,
            response,
            GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleVenue(
                this.resolver,
                request.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.DELETE,
        ['venues', {
            key: 'id',
            description: 'The unique identifier for this venue',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
    )
    @tag('venue')
    @describe(
        'Delete a venue',
        'Removes a venue from the system (physical buildings are unfortunately not removed)',
    )
    public async handleDeleteRequest(request: Request, response: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: request.params.id,
                assetType: 'venue',
            }, this.resolver, this.handler, response);
        } else {
            response.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.POST,
        ['venues'],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
        undefined,
        zod.object({
            name: zod.string(),
            capacity: zod.number(),
            color: zod.string()
                .regex(COLOR_REGEX),
        }),
    )
    @tag('venue')
    @describe(
        'Create a new venue',
        'Adds a new venue with the associated properties, building construction is left as an exercise '
        + 'to the reader',
    )
    public async handleCreateRequest(request: Request, response: Response, _: undefined, body: PostVenueBody) {
        const outgoingMessage: CreateVenueMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: request.uemsUser.userID,
            name: body.name,
            capacity: body.capacity,
            color: body.color,
            user: request.uemsUser.userID,
        };

        await this.send(
            ROUTING_KEY.venues.create,
            outgoingMessage,
            response,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    // {
    //     action: 'get',
    //     path: '/venues',
    //     handle: this.handleReadRequest(sendRequest),
    //     additionalValidator: new VenueResponseValidator(),
    // },
    @endpoint(
        Method.GET,
        ['venues'],
        ['VenueList', zod.array(ZVenue)],
        undefined,
        zod.object({
            capacity: asNumber(),
            capacityGreater: asNumber(),
            capacityLess: asNumber(),
            name: zod.string(),
        })
            .partial(),
    )
    @tag('venue')
    @describe(
        'Find a venue',
        'Search for venues against a range of properties',
    )
    @warn('Query parameters are incomplete against the range of possible options defined in uemscommlib')
    public async handleReadRequest(request: Request, response: Response, query: GetVenueQuery, _: undefined) {
        const outgoingMessage: ReadVenueMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: request.uemsUser.userID,
        };

        copyKeysIfDefined([
            'name', 'capacity',
        ], query, outgoingMessage);

        // TODO: rest of the properties
        if (query.capacityLess || query.capacityGreater) {
            outgoingMessage.capacity = {
                greater: query.capacityGreater,
                less: query.capacityLess,
            };
        }

        await this.send(
            ROUTING_KEY.venues.read,
            outgoingMessage,
            response,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveVenues(
                this.resolver,
                request.uemsUser.userID,
            )),
        );
    }

    // {
    //     action: 'patch',
    //     path: '/venues/:id',
    //     handle: this.handleUpdateRequest(sendRequest),
    //     additionalValidator: new VenueResponseValidator(),
    //     secure: ['admin', 'ops'],
    // },
    @endpoint(
        Method.PATCH,

        ['venues', {
            key: 'id',
            description: 'The unique identifier for this venue',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ops'],
        undefined,
        zod.object({
            name: zod.string()
                .optional(),
            capacity: zod.number()
                .optional(),
            color: zod.string()
                .regex(COLOR_REGEX)
                .optional(),
        }),
    )
    @tag('venue')
    @describe(
        'Update a venue',
        'Update the properties of a venue as listed',
    )
    public async handleUpdateRequest(request: Request, response: Response, _: undefined, body: PatchVenueBody) {
        const outgoingMessage: UpdateVenueMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: request.uemsUser.userID,
            id: request.params.id,
        };

        copyKeysIfDefined([
            'name', 'capacity', 'color',
        ], body, outgoingMessage);

        await this.send(
            ROUTING_KEY.venues.update,
            outgoingMessage,
            response,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
