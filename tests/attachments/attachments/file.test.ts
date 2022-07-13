import { FileGatewayInterface } from '../../../src/attachments/attachments/FileGatewayInterface';
import { EntityResolver } from '../../../src/resolver/EntityResolver';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_FILES_INVALID, GET_FILES_VALID, PATCH_FILES_FILEID_VALID, POST_EVENTS_EVENTID_FILES_MISSING, POST_EVENTS_EVENTID_FILES_VALID, POST_FILES_INVALID, POST_FILES_MISSING, POST_FILES_VALID } from '../../test-api-data';
import { AttachmentFunction, testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';

describe('FileGatewayInterface.ts', () => {
    const send = jest.fn();
    let routes: {
        'get.files': AttachmentFunction,
        'post.files': AttachmentFunction,
        'get.files.id': AttachmentFunction,
        'patch.files.id': AttachmentFunction,
        'delete.files.id': AttachmentFunction,
        'get.files.id.events': AttachmentFunction,
        'get.events.id.files': AttachmentFunction,
        'post.events.id.files': AttachmentFunction,
        'delete.events.eventID.files.fileID': AttachmentFunction,
    };

    beforeEach(() => {
        send.mockReset();
    });

    beforeAll(async () => {
        // @ts-ignore
        const resolver: EntityResolver = null;
        // @ts-ignore
        const handler: GatewayMessageHandler = null;
        const entries = new FileGatewayInterface(resolver, handler, send, null as any);

        routes = {
            'get.files': entries.queryFilesHandler,
            'post.files': entries.createFileHandler,
            'get.files.id': entries.getFileHandler,
            'patch.files.id': entries.updateFileHandler,
            'delete.files.id': entries.deleteFileHandler,
            'get.files.id.events': entries.getEventsByFileHandler,

            'get.events.id.files': entries.getFilesByEventsHandler,
            'post.events.id.files': entries.postFileToEventHandler,
            'delete.events.eventID.files.fileID': entries.deleteFileFromEventHandler,
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

    // describe('DELETE /files/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.files.id'],
    //             undefined,
    //             'query',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

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
