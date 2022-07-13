import { GatewayMk2 } from '../../../src/Gateway';
import { VenueGatewayInterface } from '../../../src/attachments/attachments/VenueGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GET_VENUES_INVALID, GET_VENUES_VALID, PATCH_VENUES_VENUEID_INVALID, PATCH_VENUES_VENUEID_VALID, POST_VENUES_INVALID, POST_VENUES_MISSING, POST_VENUES_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('VenueGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.venues': AttachmentFunction,
        'get.venues.id': AttachmentFunction,
        'post.venues': AttachmentFunction,
        'delete.venues.id': AttachmentFunction,
        'patch.venues.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new VenueGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.venues': entries.handleReadRequest,
            'get.venues.id': entries.handleGetRequest,
            'post.venues': entries.handleCreateRequest,
            'delete.venues.id': entries.handleDeleteRequest,
            'patch.venues.id': entries.handleUpdateRequest,
        };
    });

    describe('GET /venues', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.venues'],
                GET_VENUES_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.venues'],
                GET_VENUES_VALID,
                'query',
                send,
            );
        });
    });

    describe('GET /venues/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.venues.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('POST /venues', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.venues'],
                POST_VENUES_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.venues'],
                POST_VENUES_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.venues'],
                POST_VENUES_VALID,
                'body',
                send,
            );
        });
    });

    // describe('DELETE /venues/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.venues.id'],
    //             undefined,
    //             'query',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('PATCH /venues/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.venues.id'],
                PATCH_VENUES_VENUEID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.venues.id'],
                PATCH_VENUES_VENUEID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
