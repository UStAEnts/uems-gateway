import { SignupGatewayInterface } from '../../../src/attachments/attachments/SignupGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { GET_EVENTS_EVENTID_SIGNUPS_INVALID, GET_EVENTS_EVENTID_SIGNUPS_VALID, PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID, POST_EVENTS_EVENTID_SIGNUPS_MISSING, POST_EVENTS_EVENTID_SIGNUPS_VALID } from '../../test-api-data';
import { testMissingParameters, testParameterTypes, testRouteWithoutSend, testValidRoute } from '../../utils';
import { constants } from "http2";

describe('SignupGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.events.id.signups': GatewayInterfaceActionType,
        'post.events.id.signups': GatewayInterfaceActionType,
        'get.events.id.signups.id': GatewayInterfaceActionType,
        'patch.events.id.signups.id': GatewayInterfaceActionType,
        'delete.events.id.signups.id': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = await new SignupGatewayInterface().generateInterfaces(send, resolver, handler);

        routes = {
            'get.events.id.signups': entries
                .find((e) => e.action === 'get' && e.path === '/events/:eventID/signups') as GatewayInterfaceActionType,
            'post.events.id.signups': entries
                .find((e) => e.action === 'post' && e.path === '/events/:eventID/signups') as GatewayInterfaceActionType,
            'get.events.id.signups.id': entries
                .find((e) => e.action === 'get' && e.path === '/events/:eventID/signups/:id') as GatewayInterfaceActionType,
            'patch.events.id.signups.id': entries
                .find((e) => e.action === 'patch' && e.path === '/events/:eventID/signups/:id') as GatewayInterfaceActionType,
            'delete.events.id.signups.id': entries
                .find((e) => e.action === 'delete' && e.path === '/events/:eventID/signups/:id') as GatewayInterfaceActionType,
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
            await testValidRoute(
                routes['get.events.id.signups'],
                GET_EVENTS_EVENTID_SIGNUPS_VALID,
                'query',
                send,
                { eventID: 'abc' },
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
