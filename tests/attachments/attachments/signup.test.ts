import { SignupGatewayInterface } from '../../../src/attachments/attachments/SignupGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_EVENTS_EVENTID_SIGNUPS_INVALID, GET_EVENTS_EVENTID_SIGNUPS_VALID, PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID, POST_EVENTS_EVENTID_SIGNUPS_MISSING, POST_EVENTS_EVENTID_SIGNUPS_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testRouteWithoutSend, testValidRoute } from '../../utils';
import { constants } from "http2";

describe('SignupGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.events.id.signups': AttachmentFunction,
        'post.events.id.signups': AttachmentFunction,
        'get.events.id.signups.id': AttachmentFunction,
        'patch.events.id.signups.id': AttachmentFunction,
        'delete.events.id.signups.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new SignupGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.events.id.signups': entries.querySignupsHandler,
            'post.events.id.signups': entries.createSignupHandler,
            'get.events.id.signups.id': entries.getSignupHandler,
            'patch.events.id.signups.id': entries.updateSignupHandler,
            'delete.events.id.signups.id': entries.deleteSignupHandler,
        };
    });

    describe('GET /events/:id/signups', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.events.id.signups'],
                GET_EVENTS_EVENTID_SIGNUPS_INVALID,
                'query',
                send,
                { eventID: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            const {
                date,
                dateRangeBegin,
                dateRangeEnd,
                ...rest
            } = GET_EVENTS_EVENTID_SIGNUPS_VALID;
            await testValidRoute(
                routes['get.events.id.signups'],
                GET_EVENTS_EVENTID_SIGNUPS_VALID,
                'query',
                send,
                { eventID: 'abc' },
                false,
                undefined,
                {
                    date: {
                        greater: Number(GET_EVENTS_EVENTID_SIGNUPS_VALID.dateRangeBegin),
                        less: Number(GET_EVENTS_EVENTID_SIGNUPS_VALID.dateRangeEnd),
                    },
                    ...rest,
                },
            );
        });
    });

    describe('POST /events/:id/signups', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.events.id.signups'],
                POST_EVENTS_EVENTID_SIGNUPS_MISSING,
                'body',
                send,
                { eventID: 'abc' },
                ['admin'],
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.events.id.signups'],
                POST_EVENTS_EVENTID_SIGNUPS_VALID,
                'body',
                send,
                { eventID: 'abc' },
                false,
                ['admin'],
            );
        });

        it('rejects if creating for another user and not admin', async () => {
            const r = await testRouteWithoutSend(
                routes['post.events.id.signups'],
                {
                    ...POST_EVENTS_EVENTID_SIGNUPS_VALID,
                },
                'body',
                send,
                {
                    eventID: 'abc',
                    signupUser: 'another!',
                },
                ['extended'],
            );

            expect(r.statusCode)
                .toEqual(constants.HTTP_STATUS_UNAUTHORIZED);
        });

        it('rejects if creating for self and is not a valid user', async () => {
            const r = await testRouteWithoutSend(
                routes['post.events.id.signups'],
                {
                    ...POST_EVENTS_EVENTID_SIGNUPS_VALID,
                },
                'body',
                send,
                { eventID: 'abc' },
                ['extended'],
            );

            expect(r.statusCode)
                .toEqual(constants.HTTP_STATUS_UNAUTHORIZED);
        });
    });

    describe('GET /events/:id/signups/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.events.id.signups.id'],
                undefined,
                'query',
                send,
                {
                    eventID: 'abc',
                    id: 'abc',
                },
            );
        });
    });

    describe('PATCH /events/:id/signups/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.events.id.signups.id'],
                PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID,
                'body',
                send,
                {
                    eventID: 'abc',
                    id: 'abc',
                },
            );
        });
    });
});
