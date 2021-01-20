import { EntStateGatewayInterface } from '../../src/attachments/attachments/EntStateGatewayInterface';
import { GatewayMk2 } from '../../src/Gateway';
import { GET_ENTS_INVALID, GET_ENTS_VALID, PATCH_ENTS_ENTID_INVALID, PATCH_ENTS_ENTID_VALID, POST_ENTS_INVALID, POST_ENTS_MISSING, POST_ENTS_VALID } from '../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../utils';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;

describe('EntStateGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.ents': GatewayInterfaceActionType,
        'post.ents': GatewayInterfaceActionType,
        'get.ents.id': GatewayInterfaceActionType,
        'delete.ents.id': GatewayInterfaceActionType,
        'patch.ents.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        const entries = await new EntStateGatewayInterface().generateInterfaces(send);

        routes = {
            'get.ents': entries
                .find((e) => e.action === 'get' && e.path === '/ents') as GatewayInterfaceActionType,
            'post.ents': entries
                .find((e) => e.action === 'post' && e.path === '/ents') as GatewayInterfaceActionType,
            'get.ents.id': entries
                .find((e) => e.action === 'get' && e.path === '/ents/:id') as GatewayInterfaceActionType,
            'delete.ents.id': entries
                .find((e) => e.action === 'delete' && e.path === '/ents/:id') as GatewayInterfaceActionType,
            'patch.ents.id': entries
                .find((e) => e.action === 'patch' && e.path === '/ents/:id') as GatewayInterfaceActionType,
        };
    });

    describe('GET /ents', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.ents'],
                GET_ENTS_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.ents'],
                GET_ENTS_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /ents', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.ents'],
                POST_ENTS_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.ents'],
                POST_ENTS_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.ents'],
                POST_ENTS_VALID,
                'body',
                send,
            );
        });
    });

    describe('DELETE /ents/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['delete.ents.id'],
                undefined,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /ents/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.ents.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /ents/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.ents.id'],
                PATCH_ENTS_ENTID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.ents.id'],
                PATCH_ENTS_ENTID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
