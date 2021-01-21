import { FileGatewayInterface } from '../../../src/attachments/attachments/FileGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { GET_FILES_INVALID, GET_FILES_VALID, PATCH_FILES_FILEID_VALID, POST_EVENTS_EVENTID_FILES_MISSING, POST_EVENTS_EVENTID_FILES_VALID, POST_FILES_INVALID, POST_FILES_MISSING, POST_FILES_VALID } from '../../test-api-data';
import { testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('FileGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.files': GatewayInterfaceActionType,
        'post.files': GatewayInterfaceActionType,
        'get.files.id': GatewayInterfaceActionType,
        'patch.files.id': GatewayInterfaceActionType,
        'delete.files.id': GatewayInterfaceActionType,
        'get.files.id.events': GatewayInterfaceActionType,
        'get.events.id.files': GatewayInterfaceActionType,
        'post.events.id.files': GatewayInterfaceActionType,
        'delete.events.eventID.files.fileID': GatewayInterfaceActionType,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        const entries = await new FileGatewayInterface().generateInterfaces(send, resolver);

        routes = {
            'get.files': entries
                .find((e) => e.action === 'get' && e.path === '/files') as GatewayInterfaceActionType,
            'post.files': entries
                .find((e) => e.action === 'post' && e.path === '/files') as GatewayInterfaceActionType,
            'get.files.id': entries
                .find((e) => e.action === 'get' && e.path === '/files/:id') as GatewayInterfaceActionType,
            'patch.files.id': entries
                .find((e) => e.action === 'patch' && e.path === '/files/:id') as GatewayInterfaceActionType,
            'delete.files.id': entries
                .find((e) => e.action === 'delete' && e.path === '/files/:id') as GatewayInterfaceActionType,
            'get.files.id.events': entries
                .find((e) => e.action === 'get' && e.path === '/files/:id/events') as GatewayInterfaceActionType,

            'get.events.id.files': entries
                .find((e) => e.action === 'get' && e.path === '/events/:id/files') as GatewayInterfaceActionType,
            'post.events.id.files': entries
                .find((e) => e.action === 'post' && e.path === '/events/:id/files') as GatewayInterfaceActionType,
            'delete.events.eventID.files.fileID': entries
                .find((e) => e.action === 'delete' && e.path === '/events/:eventID/files/:fileID') as GatewayInterfaceActionType,
        };
    });

    describe('GET /files', () => {
        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['get.files'],
                GET_FILES_INVALID,
                'query',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.files'],
                GET_FILES_VALID,
                'query',
                send,
            );
        });
    });

    describe('POST /files', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.files'],
                POST_FILES_MISSING,
                'body',
                send,
            );
        });

        it('rejects on wrong parameter types', async () => {
            await testParameterTypes(
                routes['post.files'],
                POST_FILES_INVALID,
                'body',
                send,
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.files'],
                POST_FILES_VALID,
                'body',
                send,
            );
        });
    });

    describe('DELETE /files/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['delete.files.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /files/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.files.id'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('PATCH /files/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['patch.files.id'],
                PATCH_FILES_FILEID_VALID,
                'body',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /files/:id/events', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.files.id.events'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('GET /events/:id/files', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['get.events.id.files'],
                undefined,
                'query',
                send,
                { id: 'abc' },
            );
        });
    });

    describe('POST /events/:id/files', () => {
        it('rejects on missing parameters', async () => {
            await testMissingParameters(
                routes['post.events.id.files'],
                POST_EVENTS_EVENTID_FILES_MISSING,
                'body',
                send,
                { id: 'abc' },
            );
        });

        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['post.events.id.files'],
                POST_EVENTS_EVENTID_FILES_VALID,
                'body',
                send,
                { id: 'abc' },
                true,
            );
        });
    });

    describe('DELETE /events/:id/files/:id', () => {
        it('sends on a valid message', async () => {
            await testValidRoute(
                routes['delete.events.eventID.files.fileID'],
                undefined,
                'query',
                send,
                {
                    eventID: 'abc',
                    fileID: 'abc',
                },
            );
        });
    });
});
