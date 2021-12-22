import { GatewayMk2 } from '../../../src/Gateway';
import { VenueGatewayInterface } from '../../../src/attachments/attachments/VenueGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GET_VENUES_INVALID, GET_VENUES_VALID, PATCH_VENUES_VENUEID_INVALID, PATCH_VENUES_VENUEID_VALID, POST_VENUES_INVALID, POST_VENUES_MISSING, POST_VENUES_VALID } from '../../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;

describe('VenueGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.venues': GatewayInterfaceActionType,
        'get.venues.id': GatewayInterfaceActionType,
        'post.venues': GatewayInterfaceActionType,
        'delete.venues.id': GatewayInterfaceActionType,
        'patch.venues.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = await new VenueGatewayInterface().generateInterfaces(send, resolver, handler);

        routes = {
            'get.venues': entries
                .find((e) => e.action === 'get' && e.path === '/venues') as GatewayInterfaceActionType,
            'get.venues.id': entries
                .find((e) => e.action === 'get' && e.path === '/venues/:id') as GatewayInterfaceActionType,
            'post.venues': entries
                .find((e) => e.action === 'post' && e.path === '/venues') as GatewayInterfaceActionType,
            'delete.venues.id': entries
                .find((e) => e.action === 'delete' && e.path === '/venues/:id') as GatewayInterfaceActionType,
            'patch.venues.id': entries
                .find((e) => e.action === 'patch' && e.path === '/venues/:id') as GatewayInterfaceActionType,
        };
    });

    describe('GET /venues', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.venues'],
                GET_VENUES_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.venues'],
                GET_VENUES_VALID,
                'query',
                send,
            );
        });
    });

    describe('GET /venues/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.venues.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('POST /venues', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.venues'],
                POST_VENUES_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.venues'],
                POST_VENUES_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.venues'],
                POST_VENUES_VALID,
                'body',
                send,
            );
        });
    });

    // describe('DELETE /venues/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.venues.id'],
    //             undefined,
    //             'query',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('PATCH /venues/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.venues.id'],
                PATCH_VENUES_VENUEID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.venues.id'],
                PATCH_VENUES_VENUEID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
