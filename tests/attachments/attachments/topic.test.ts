import { TopicGatewayInterface } from '../../../src/attachments/attachments/TopicGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_TOPICS_INVALID, GET_TOPICS_VALID, PATCH_TOPICS_TOPICID_INVALID, PATCH_TOPICS_TOPICID_VALID, POST_TOPICS_INVALID, POST_TOPICS_MISSING, POST_TOPICS_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import { EntityResolver } from "../../../src/resolver/EntityResolver";

describe('TopicGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.topics': AttachmentFunction,
        'post.topics': AttachmentFunction,
        'get.topics.id': AttachmentFunction,
        'delete.topics.id': AttachmentFunction,
        'patch.topics.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new TopicGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.topics': entries.queryTopicsHandler,
            'post.topics': entries.createTopicHandler,
            'get.topics.id': entries.getTopicHandler,
            'delete.topics.id': entries.deleteTopicHandler,
            'patch.topics.id': entries.updateTopicHandler,
        };
    });

    describe('GET /topics', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.topics'],
                GET_TOPICS_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.topics'],
                GET_TOPICS_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /topics', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.topics'],
                POST_TOPICS_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.topics'],
                POST_TOPICS_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.topics'],
                POST_TOPICS_VALID,
                'body',
                send,
            );
        });
    });

    // describe('DELETE /topics/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.topics.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /topics/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.topics.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /topics/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.topics.id'],
                PATCH_TOPICS_TOPICID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.topics.id'],
                PATCH_TOPICS_TOPICID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
