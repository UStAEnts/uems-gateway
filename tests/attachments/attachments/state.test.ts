import { StateGatewayInterface } from '../../../src/attachments/attachments/StateGatewayInterface';
import { GET_STATES_INVALID, GET_STATES_VALID, PATCH_STATES_STATEID_INVALID, PATCH_STATES_STATEID_VALID, POST_STATES_INVALID, POST_STATES_MISSING, POST_STATES_VALID } from '../../test-api-data';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import request from 'supertest';
import { constants } from 'http2';
import { MsgStatus } from '@uems/uemscommlib';

describe('StateGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        StateGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /states', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/states')
                .query(GET_STATES_INVALID)
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
                .get('/api/states')
                .send(GET_STATES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /states', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/states')
                .send(POST_STATES_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/states')
                .send(POST_STATES_INVALID)
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
                .post('/api/states')
                .send(POST_STATES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
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
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/states/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /states/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .patch('/api/states/abc')
                .send(PATCH_STATES_STATEID_INVALID)
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
                .patch('/api/states/abc')
                .send(PATCH_STATES_STATEID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
