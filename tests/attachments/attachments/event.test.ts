import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { EventGatewayAttachment } from '../../../src/attachments/attachments/EventGatewayAttachment';
import { GET_EVENTS_INVALID, GET_EVENTS_VALID, PATCH_EVENTS_EVENTID_INVALID, PATCH_EVENTS_EVENTID_VALID, POST_EVENTS_EVENTID_COMMENTS_INVALID, POST_EVENTS_EVENTID_COMMENTS_MISSING, POST_EVENTS_EVENTID_COMMENTS_VALID, POST_EVENTS_INVALID, POST_EVENTS_MISSING, POST_EVENTS_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('EventGatewayAttachment.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.events': AttachmentFunction,
        'post.events': AttachmentFunction,
        'get.events.id': AttachmentFunction,
        'patch.events.id': AttachmentFunction,
        'delete.events.id': AttachmentFunction,
        'get.events.id.comments': AttachmentFunction,
        'post.events.id.comments': AttachmentFunction,
        'get.states.id.events': AttachmentFunction,
        'get.venues.id.events': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new EventGatewayAttachment(resolver, handler, send, null as any);

        routes = {
            'get.events': entries.getEventsHandler,
            'post.events': entries.createEventHandler,
            'get.events.id': entries.getEventHandler,
            'patch.events.id': entries.updateEventHandler,
            'delete.events.id': entries.deleteEventHandler,
            'get.events.id.comments': entries.getCommentsForEvent,
            'post.events.id.comments': entries.postCommentsForEvent,
            'get.states.id.events': entries.getEventsByState,
            'get.venues.id.events': entries.getEventsByVenue,
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

    // describe('DELETE /events/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.events.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

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
