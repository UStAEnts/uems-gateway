import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { EquipmentGatewayInterface } from '../../../src/attachments/attachments/EquipmentGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_EQUIPMENT_INVALID, GET_EQUIPMENT_VALID, PATCH_EQUIPMENT_EQUIPMENTID_INVALID, PATCH_EQUIPMENT_EQUIPMENTID_VALID, POST_EQUIPMENT_INVALID, POST_EQUIPMENT_MISSING, POST_EQUIPMENT_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;

describe('EquipmentGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.equipment': AttachmentFunction,
        'post.equipment': AttachmentFunction,
        'get.equipment.id': AttachmentFunction,
        'delete.equipment.id': AttachmentFunction,
        'patch.equipment.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new EquipmentGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.equipment': entries.queryEquipmentsHandler,
            'post.equipment': entries.createEquipmentHandler,
            'get.equipment.id': entries.getEquipmentHandler,
            'delete.equipment.id': entries.deleteEquipmentHandler,
            'patch.equipment.id': entries.updateEquipmentHandler,
        };
    });

    describe('GET /equipment', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.equipment'],
                GET_EQUIPMENT_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.equipment'],
                GET_EQUIPMENT_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /equipment', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.equipment'],
                POST_EQUIPMENT_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.equipment'],
                POST_EQUIPMENT_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.equipment'],
                POST_EQUIPMENT_VALID,
                'body',
                send,
            );
        });
    });

    // describe('DELETE /equipment/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.equipment.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /equipment/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.equipment.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /equipment/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.equipment.id'],
                PATCH_EQUIPMENT_EQUIPMENTID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.equipment.id'],
                PATCH_EQUIPMENT_EQUIPMENTID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
