import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { EquipmentMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Resolver } from '../Resolvers';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { copyKeysIfDefined, describe, endpoint, mapKeysIfDefined, Method, tag } from '../../decorators/endpoint';
import { EquipmentValidators } from '@uems/uemscommlib/build/equipment/EquipmentValidators';
import ReadEquipmentMessage = EquipmentMessage.ReadEquipmentMessage;
import CreateEquipmentMessage = EquipmentMessage.CreateEquipmentMessage;
import UpdateEquipmentMessage = EquipmentMessage.UpdateEquipmentMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import Attachment = GatewayMk2.Attachment;
import ZEquipment = EquipmentValidators.ZEquipment;
import { Configuration } from "../../configuration/Configuration";

type GetEquipmentQuery = Partial<{
    amount: number,
    assetID: string,
    category: string,
    date: number,
    id: string,
    locationID: string,
    locationSpecifier: string,
    managerID: string,
    manufacturer: string,
    miscIdentifier: string,
    model: string,
    name: string,
}>;

type CreateEquipmentBody = {
    name: string,
    manufacturer: string,
    model: string,
    amount: number,
    location: string,
    category: string,
    assetID?: string,
    miscIdentifier?: string,
    locationSpecifier?: string,
};

type UpdateEquipmentBody = {
    assetID?: string,
    name?: string,
    manufacturer?: string,
    model?: string,
    miscIdentifier?: string,
    amount?: number,
    locationID?: string,
    locationSpecifier?: string,
    managerID?: string,
    category?: string,
};

export class EquipmentGatewayInterface extends Attachment {
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
        ['equipment'],
        ['EquipmentList', zod.array(ZEquipment)],
        ['admin', 'ents'],
        zod.object({
            amount: zod.preprocess((v) => Number(v), zod.number()),
            assetID: zod.string(),
            category: zod.string(),
            date: zod.preprocess((v) => Number(v), zod.number()),
            id: zod.string(),
            locationID: zod.string(),
            locationSpecifier: zod.string(),
            managerID: zod.string(),
            manufacturer: zod.string(),
            miscIdentifier: zod.string(),
            model: zod.string(),
            name: zod.string(),
        })
            .partial(),
    )
    @tag('equipment')
    @describe(
        'Search for equipment',
        'Full querying support for equipment is provided through this endpoint. Individual equipment entries can be '
        + 'looked up via the /equipment/{id} endpoint. ',
    )
    async queryEquipmentsHandler(req: Request, res: Response, query: GetEquipmentQuery, _: undefined): Promise<void> {
        const outgoing: ReadEquipmentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        copyKeysIfDefined([
            'amount', 'assetID', 'category', 'date', 'id', 'locationSpecifier', 'manufacturer', 'miscIdentifier',
            'model', 'name',
        ], query, outgoing);

        mapKeysIfDefined({
            locationID: 'location',
            managerID: 'manager',
        }, query, outgoing);

        await this.send(
            ROUTING_KEY.equipment.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEquipments(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.GET,
        [
            'equipment',
            {
                key: 'id',
                description: 'The unique ID of this piece of equipment',
            },
        ],
        ['Equipment', ZEquipment],
        ['admin', 'ents'],
        zod.object({})
            .strict(),
    )
    @tag('equipment')
    @describe(
        'Get details for a single equipment entry',
        'Retrieves information about a single equipment entry based on ID. ',
    )
    public async getEquipmentHandler(req: Request, res: Response, _0: {}, _1: undefined) {
        const outgoingMessage: ReadEquipmentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        await this.send(
            ROUTING_KEY.equipment.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleEquipment(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.POST,
        ['equipment'],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ents'],
        undefined,
        zod.object({
            name: zod.string(),
            manufacturer: zod.string(),
            model: zod.string(),
            amount: zod.number(),
            location: zod.string(),
            category: zod.string(),

            assetID: zod.string()
                .optional(),
            miscIdentifier: zod.string()
                .optional(),
            locationSpecifier: zod.string()
                .optional(),
        }),
    )
    @tag('equipment')
    @describe('Creates a new equipment asset', 'This adds a new piece of equipment to the entry catalogue')
    public async createEquipmentHandler(req: Request, res: Response, _: undefined, body: CreateEquipmentBody) {
        const outgoingMessage: CreateEquipmentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            name: body.name,
            manufacturer: body.manufacturer,
            model: body.model,
            amount: body.amount,
            location: body.location,
            category: body.category,
            date: Math.floor(Date.now() / 1000),
            manager: req.uemsUser.userID,
        };

        copyKeysIfDefined([
            'assetID',
            'miscIdentifier',
            'locationSpecifier',
        ], body, outgoingMessage);

        await this.send(
            ROUTING_KEY.equipment.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        [
            'equipment',
            {
                key: 'id',
                description: 'The unique ID for this piece of equipment',
            },
        ],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ents'],
    )
    @tag('equipment')
    @describe(
        'Deletes a piece of equipment',
        'Removes a single equipment entry from the database',
    )
    public async deleteEquipmentHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'equipment',
            }, this.resolver, this.handler, res);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    //         {
    //             action: 'patch',
    //             path: '/equipment/:id',
    //             handle: this.updateEquipmentHandler(send),
    //             additionalValidator: validator,
    //             secure: ['admin', 'ents'],
    //         },
    @endpoint(
        Method.PATCH,
        ['equipment', {
            key: 'id',
            description: 'The unique ID for this piece of equipment',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin', 'ents'],
        undefined,
        zod.object({
            assetID: zod.string(),
            name: zod.string(),
            manufacturer: zod.string(),
            model: zod.string(),
            miscIdentifier: zod.string(),
            amount: zod.number(),
            locationID: zod.string(),
            locationSpecifier: zod.string(),
            managerID: zod.string(),
            category: zod.string(),
        })
            .partial(),
    )
    @tag('equipment')
    @describe(
        'Deletes an equipment entry',
        'Deletes this piece of equipment from the records unless there are dependent objects on it',
    )
    public async updateEquipmentHandler(req: Request, res: Response, _: undefined, body: UpdateEquipmentBody) {
        const outgoing: UpdateEquipmentMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined([
            'amount',
            'category',
            'miscIdentifier',
            'locationSpecifier',
            'manufacturer',
            'model',
            'name',
            'assetID',
        ], body, outgoing);

        mapKeysIfDefined({
            managerID: 'manager',
            locationID: 'location',
        }, body, outgoing);

        await this.send(
            ROUTING_KEY.equipment.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
