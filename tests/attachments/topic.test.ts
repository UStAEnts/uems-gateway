import { TopicGatewayInterface } from '../../src/attachments/attachments/TopicGatewayInterface';
import { GatewayMk2 } from '../../src/Gateway';
import { GET_TOPICS_INVALID, GET_TOPICS_VALID, PATCH_TOPICS_TOPICID_INVALID, PATCH_TOPICS_TOPICID_VALID, POST_TOPICS_INVALID, POST_TOPICS_MISSING, POST_TOPICS_VALID } from '../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../utils';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;

describe('TopicGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.topics': GatewayInterfaceActionType,
        'post.topics': GatewayInterfaceActionType,
        'get.topics.id': GatewayInterfaceActionType,
        'delete.topics.id': GatewayInterfaceActionType,
        'patch.topics.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        const entries = await new TopicGatewayInterface().generateInterfaces(send);

        routes = {
            'get.topics': entries
                .find((e) => e.action === 'get' && e.path === '/topics') as GatewayInterfaceActionType,
            'post.topics': entries
                .find((e) => e.action === 'post' && e.path === '/topics') as GatewayInterfaceActionType,
            'get.topics.id': entries
                .find((e) => e.action === 'get' && e.path === '/topics/:id') as GatewayInterfaceActionType,
            'delete.topics.id': entries
                .find((e) => e.action === 'delete' && e.path === '/topics/:id') as GatewayInterfaceActionType,
            'patch.topics.id': entries
                .find((e) => e.action === 'patch' && e.path === '/topics/:id') as GatewayInterfaceActionType,
        };
    });

    describe('GET /topics', () => {
        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['get.topics'],
                GET_TOPICS_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['get.topics'],
                GET_TOPICS_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /topics', () => {
        it('rejects on missing parameters', () => {
            testMissingParameters(
                routes['post.topics'],
                POST_TOPICS_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['post.topics'],
                POST_TOPICS_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['post.topics'],
                POST_TOPICS_VALID,
                'body',
                send,
            );
        });
    });

    describe('DELETE /topics/:id', () => {
        it('sends on a valid message', () => {
            testValidRoute(
                routes['delete.topics.id'],
                undefined,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /topics/:id', () => {
        it('sends on a valid message', () => {
            testValidRoute(
                routes['get.topics.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /topics/:id', () => {
        it('rejects on wrong parameter types', () => {
            testParameterTypes(
                routes['patch.topics.id'],
                PATCH_TOPICS_TOPICID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', () => {
            testValidRoute(
                routes['patch.topics.id'],
                PATCH_TOPICS_TOPICID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
