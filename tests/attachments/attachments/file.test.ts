import { GET_FILES_INVALID, GET_FILES_VALID, PATCH_FILES_FILEID_VALID, POST_EVENTS_EVENTID_FILES_MISSING, POST_EVENTS_EVENTID_FILES_VALID, POST_FILES_INVALID, POST_FILES_MISSING, POST_FILES_VALID } from '../../test-api-data';
import { ExpressApplication } from "../../../src/express/ExpressApplication";
import request from "supertest";
import { constants } from "http2";
import { MsgStatus } from "@uems/uemscommlib";
import { FileGatewayInterface } from "../../../src/attachments/attachments/FileGatewayInterface";

describe('FileGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, {
        resolveUser: () => ({})
    } as any, null as any, null as any, [
        FileGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /files', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/files')
                .query(GET_FILES_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .get('/api/files')
                .query(GET_FILES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /files', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/files')
                .send(POST_FILES_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/files')
                .send(POST_FILES_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .post('/api/files')
                .send(POST_FILES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
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
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/files/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /files/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .patch('/api/files/abc')
                .send(PATCH_FILES_FILEID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /files/:id/events', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .get('/api/files/abc/events')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /events/:id/files', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .get('/api/events/abc/files')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /events/:id/files', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/events/abc/files')
                .send(POST_EVENTS_EVENTID_FILES_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .post('/api/events/abc/files')
                .send(POST_EVENTS_EVENTID_FILES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('DELETE /events/:id/files/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .delete('/api/events/abc/files/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
