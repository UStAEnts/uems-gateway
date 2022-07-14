import { UserGatewayInterface } from '../../../src/attachments/attachments/UserGatewayInterface';
import { GET_USER_VALID, PATCH_USER_USERID_VALID } from '../../test-api-data';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import { MsgStatus } from '@uems/uemscommlib';
import request from 'supertest';

describe('UserGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        UserGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /user', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .get('/api/user')
                .send(GET_USER_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
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
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/user/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /user/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .patch('/api/user/abc')
                .send(PATCH_USER_USERID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
