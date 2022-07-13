import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import { StateGatewayInterface } from '../../../src/attachments/attachments/StateGatewayInterface';
import { GET_STATES_INVALID, GET_STATES_VALID, PATCH_STATES_STATEID_INVALID, PATCH_STATES_STATEID_VALID, POST_STATES_INVALID, POST_STATES_MISSING, POST_STATES_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('StateGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        // 'get.states.id.events': AttachmentFunction,
        'get.states': AttachmentFunction,
        'post.states': AttachmentFunction,
        'get.states.id': AttachmentFunction,
        'patch.states.id': AttachmentFunction,
        'delete.states.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new StateGatewayInterface(resolver, handler, send, null as any);

        routes = {
            // 'get.states.id.events': entries.getReviewStates,
            'get.states': entries.queryStatesHandler,
            'post.states': entries.createStateHandler,
            'get.states.id': entries.getStateHandler,
            'patch.states.id': entries.updateStateHandler,
            'delete.states.id': entries.deleteStateHandler,
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

    // describe('DELETE /states/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.states.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

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
