import { EntStateGatewayInterface } from '../../../src/attachments/attachments/EntStateGatewayInterface';
import { GET_ENTS_INVALID, GET_ENTS_VALID, PATCH_ENTS_ENTID_INVALID, PATCH_ENTS_ENTID_VALID, POST_ENTS_INVALID, POST_ENTS_MISSING, POST_ENTS_VALID } from '../../test-api-data';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import request from 'supertest';
import { constants } from 'http2';
import { MsgStatus } from '@uems/uemscommlib';

describe('EntStateGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        EntStateGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /ents', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/ents')
                .query(GET_ENTS_INVALID)
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
                .get('/api/ents')
                .query(GET_ENTS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /ents', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/ents')
                .send(POST_ENTS_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
            // await testMissingParameters(
            //     routes['post.ents'],
            //     POST_ENTS_MISSING,
            //     'body',
            //     send,
            // );
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/ents')
                .send(POST_ENTS_INVALID)
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
                .post('/api/ents')
                .send(POST_ENTS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    // describe('DELETE /ents/:id', () => {
    //     it('sends on a valid message', async () => {
    //         send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
    //             msg_id: 0,
    //             status: MsgStatus.SUCCESS,
    //             result: [],
    //         }, 200));
    //
    //         await request(app.app)
    //             .delete('/api/ents/abc')
    //             .expect(200);
    //
    //         expect(send)
    //             .toHaveBeenCalled();
    //     });
    // });

    describe('GET /ents/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/ents/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /ents/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .patch('/api/ents/abc')
                .send(PATCH_ENTS_ENTID_INVALID)
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
                .patch('/api/ents/abc')
                .send(PATCH_ENTS_ENTID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
