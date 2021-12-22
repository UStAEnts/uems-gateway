import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { EventGatewayAttachment } from '../../../src/attachments/attachments/EventGatewayAttachment';
import { GET_EVENTS_INVALID, GET_EVENTS_VALID, PATCH_EVENTS_EVENTID_INVALID, PATCH_EVENTS_EVENTID_VALID, POST_EVENTS_EVENTID_COMMENTS_INVALID, POST_EVENTS_EVENTID_COMMENTS_MISSING, POST_EVENTS_EVENTID_COMMENTS_VALID, POST_EVENTS_INVALID, POST_EVENTS_MISSING, POST_EVENTS_VALID } from '../../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('EventGatewayAttachment.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.events': GatewayInterfaceActionType,
        'post.events': GatewayInterfaceActionType,
        'get.events.id': GatewayInterfaceActionType,
        'patch.events.id': GatewayInterfaceActionType,
        'delete.events.id': GatewayInterfaceActionType,
        'get.events.id.comments': GatewayInterfaceActionType,
        'post.events.id.comments': GatewayInterfaceActionType,
        'get.states.id.events': GatewayInterfaceActionType,
        'get.venues.id.events': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = await new EventGatewayAttachment().generateInterfaces(send, resolver, handler);

        routes = {
            'get.events': entries
                .find((e) => e.action === 'get' && e.path === '/events') as GatewayInterfaceActionType,
            'post.events': entries
                .find((e) => e.action === 'post' && e.path === '/events') as GatewayInterfaceActionType,
            'get.events.id': entries
                .find((e) => e.action === 'get' && e.path === '/events/:id') as GatewayInterfaceActionType,
            'patch.events.id': entries
                .find((e) => e.action === 'patch' && e.path === '/events/:id') as GatewayInterfaceActionType,
            'delete.events.id': entries
                .find((e) => e.action === 'delete' && e.path === '/events/:id') as GatewayInterfaceActionType,
            'get.events.id.comments': entries
                .find((e) => e.action === 'get' && e.path === '/events/:id/comments') as GatewayInterfaceActionType,
            'post.events.id.comments': entries
                .find((e) => e.action === 'post' && e.path === '/events/:id/comments') as GatewayInterfaceActionType,
            'get.states.id.events': entries
                .find((e) => e.action === 'get' && e.path === '/states/:id/events') as GatewayInterfaceActionType,
            'get.venues.id.events': entries
                .find((e) => e.action === 'get' && e.path === '/venues/:id/events') as GatewayInterfaceActionType,
        };
    });

    describe('POST /events', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.events'],
                POST_EVENTS_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.events'],
                POST_EVENTS_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.events'],
                POST_EVENTS_VALID,
                'body',
                send,
                undefined,
                true,
            );
        });
    });

    describe('GET /events', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.events'],
                GET_EVENTS_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.events'],
                GET_EVENTS_VALID,
                'query',
                send,
                undefined,
                true,
            );
        });
    });

    describe('GET /events/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.events.id'],
                undefined,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /events/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.events.id'],
                PATCH_EVENTS_EVENTID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.events.id'],
                PATCH_EVENTS_EVENTID_VALID,
                'body',
                send,
                { id: 'abc' },
                true,
            );
        });
    });

    describe('DELETE /events/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['delete.events.id'],
                undefined,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /states/:id/events', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.states.id.events'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /venues/:id/events', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.venues.id.events'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /events/:id/comments', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.events.id.comments'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('POST /events/:id/comments', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.events.id.comments'],
                POST_EVENTS_EVENTID_COMMENTS_MISSING,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.events.id.comments'],
                POST_EVENTS_EVENTID_COMMENTS_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.events.id.comments'],
                POST_EVENTS_EVENTID_COMMENTS_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
