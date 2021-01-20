import { UserGatewayInterface } from '../../src/attachments/attachments/UserGatewayInterface';
import { GatewayMk2 } from '../../src/Gateway';
import { GET_USER_INVALID, GET_USER_VALID, PATCH_USER_USERID_INVALID, PATCH_USER_USERID_VALID, POST_USER_INVALID, POST_USER_MISSING, POST_USER_VALID } from '../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../utils';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;

describe('UserGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.user': GatewayInterfaceActionType,
        'post.user': GatewayInterfaceActionType,
        'get.user.id': GatewayInterfaceActionType,
        'delete.user.id': GatewayInterfaceActionType,
        'patch.user.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        const entries = await new UserGatewayInterface().generateInterfaces(send);

        routes = {
            'get.user': entries
                .find((e) => e.action === 'get' && e.path === '/user') as GatewayInterfaceActionType,
            'post.user': entries
                .find((e) => e.action === 'post' && e.path === '/user') as GatewayInterfaceActionType,
            'get.user.id': entries
                .find((e) => e.action === 'get' && e.path === '/user/:id') as GatewayInterfaceActionType,
            'delete.user.id': entries
                .find((e) => e.action === 'delete' && e.path === '/user/:id') as GatewayInterfaceActionType,
            'patch.user.id': entries
                .find((e) => e.action === 'patch' && e.path === '/user/:id') as GatewayInterfaceActionType,
        };
    });
    describe('GET /user', () => {
        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['get.user'],
                GET_USER_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['get.user'],
                GET_USER_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /user', () => {
        it('rejects on missing parameters', () => {
            testMissingParameters(
                routes['post.user'],
                POST_USER_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['post.user'],
                POST_USER_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['post.user'],
                POST_USER_VALID,
                'body',
                send,
            );
        });
    });

    describe('DELETE /user/:id', () => {
        it('sends on a valid message', () => {
            testValidRoute(
                routes['delete.user.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /user/:id', () => {
        it('sends on a valid message', () => {
            testValidRoute(
                routes['get.user.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /user/:id', () => {
        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['patch.user.id'],
                PATCH_USER_USERID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['patch.user.id'],
                PATCH_USER_USERID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
