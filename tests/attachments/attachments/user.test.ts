import { UserGatewayInterface } from '../../../src/attachments/attachments/UserGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_USER_INVALID, GET_USER_VALID, PATCH_USER_USERID_VALID, POST_USER_MISSING, POST_USER_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import { EntityResolver } from "../../../src/resolver/EntityResolver";

describe('UserGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.user': AttachmentFunction,
        // 'post.user': AttachmentFunction,
        'get.user.id': AttachmentFunction,
        'delete.user.id': AttachmentFunction,
        'patch.user.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new UserGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.user': entries.queryUsersHandler,
            // 'post.user': entries.cre,
            'get.user.id': entries.getUserHandler,
            'delete.user.id': entries.deleteUserHandler,
            'patch.user.id': entries.updateUserHandler,
        };
    });
    describe('GET /user', () => {

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.user'],
                GET_USER_VALID,
                'query',
                send,
            );
        });
    });

    // describe('DELETE /user/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.user.id'],
    //             undefined,
    //             'query',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /user/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.user.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /user/:id', () => {

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.user.id'],
                PATCH_USER_USERID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
