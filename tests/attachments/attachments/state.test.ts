import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { StateGatewayInterface } from '../../../src/attachments/attachments/StateGatewayInterface';
import { GET_STATES_INVALID, GET_STATES_VALID, PATCH_STATES_STATEID_INVALID, PATCH_STATES_STATEID_VALID, POST_STATES_INVALID, POST_STATES_MISSING, POST_STATES_VALID } from '../../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('StateGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.states.id.events': GatewayInterfaceActionType,
        'get.states': GatewayInterfaceActionType,
        'post.states': GatewayInterfaceActionType,
        'get.states.id': GatewayInterfaceActionType,
        'patch.states.id': GatewayInterfaceActionType,
        'delete.states.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        const entries = await new StateGatewayInterface().generateInterfaces(send);

        routes = {
            'get.states.id.events': entries
                .find((e) => e.action === 'get' && e.path === '/states/:id/events') as GatewayInterfaceActionType,
            'get.states': entries
                .find((e) => e.action === 'get' && e.path === '/states') as GatewayInterfaceActionType,
            'post.states': entries
                .find((e) => e.action === 'post' && e.path === '/states') as GatewayInterfaceActionType,
            'get.states.id': entries
                .find((e) => e.action === 'get' && e.path === '/states/:id') as GatewayInterfaceActionType,
            'patch.states.id': entries
                .find((e) => e.action === 'patch' && e.path === '/states/:id') as GatewayInterfaceActionType,
            'delete.states.id': entries
                .find((e) => e.action === 'delete' && e.path === '/states/:id') as GatewayInterfaceActionType,
        };
    });

    describe('GET /states', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.states'],
                GET_STATES_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.states'],
                GET_STATES_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /states', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.states'],
                POST_STATES_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.states'],
                POST_STATES_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.states'],
                POST_STATES_VALID,
                'body',
                send,
            );
        });
    });

    describe('DELETE /states/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['delete.states.id'],
                undefined,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /states/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.states.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /states/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.states.id'],
                PATCH_STATES_STATEID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.states.id'],
                PATCH_STATES_STATEID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
