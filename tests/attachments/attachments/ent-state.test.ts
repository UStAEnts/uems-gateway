import { EntStateGatewayInterface } from '../../../src/attachments/attachments/EntStateGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_ENTS_INVALID, GET_ENTS_VALID, PATCH_ENTS_ENTID_INVALID, PATCH_ENTS_ENTID_VALID, POST_ENTS_INVALID, POST_ENTS_MISSING, POST_ENTS_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { EntityResolver } from "../../../src/resolver/EntityResolver";
import { Configuration } from "../../../src/configuration/Configuration";
import { Request, Response } from "express";

describe('EntStateGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.ents': AttachmentFunction,
        'post.ents': AttachmentFunction,
        'get.ents.id': AttachmentFunction,
        'delete.ents.id': AttachmentFunction,
        'patch.ents.id': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        // @ts-ignore
        const config: Configuration = null;
        const entries = new EntStateGatewayInterface(resolver, handler, send, config);

        routes = {
            'get.ents': entries.queryEntStatesHandler,
            'post.ents': entries.createEntStateHandler,
            'get.ents.id': entries.getEntStateHandler,
            'delete.ents.id': entries.deleteEntStateHandler,
            'patch.ents.id': entries.updateEntStateHandler,
        };
    });

    describe('GET /ents', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.ents'],
                GET_ENTS_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.ents'],
                GET_ENTS_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /ents', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.ents'],
                POST_ENTS_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.ents'],
                POST_ENTS_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.ents'],
                POST_ENTS_VALID,
                'body',
                send,
            );
        });
    });

    // describe('DELETE /ents/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.ents.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /ents/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.ents.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /ents/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['patch.ents.id'],
                PATCH_ENTS_ENTID_INVALID,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.ents.id'],
                PATCH_ENTS_ENTID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });
});
