import { GET_EVENTS_EVENTID_SIGNUPS_INVALID, GET_EVENTS_EVENTID_SIGNUPS_VALID, PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID, POST_EVENTS_EVENTID_SIGNUPS_MISSING, POST_EVENTS_EVENTID_SIGNUPS_VALID } from '../../test-api-data';
import { constants } from 'http2';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import request from 'supertest';
import { MsgStatus } from '@uems/uemscommlib';
import { SignupGatewayInterface } from '../../../src/attachments/attachments/SignupGatewayInterface';

describe('SignupGatewayInterface.ts', () => {
    const send = jest.fn();
    const roleFunction = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.debuggingRoleDecider = roleFunction;
    app.attach(send, {
        resolveUser: () => ({}),
        resolveEvent: () => ({}),
    } as any, null as any, null as any, [
        SignupGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
        roleFunction.mockReset()
            .mockReturnValue(true);
    });

    describe('GET /events/:id/signups', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/events/abc/signups')
                .query(GET_EVENTS_EVENTID_SIGNUPS_INVALID)
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
                .get('/api/events/abc/signups')
                .send(GET_EVENTS_EVENTID_SIGNUPS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /events/:id/signups', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/events/abc/signups')
                .send(POST_EVENTS_EVENTID_SIGNUPS_MISSING)
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
                .post('/api/events/abc/signups')
                .send(POST_EVENTS_EVENTID_SIGNUPS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });

        it('rejects if creating for another user and not admin', async () => {
            roleFunction.mockImplementation((r) => r !== 'admin');
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .post('/api/events/abc/signups')
                .send({
                    ...POST_EVENTS_EVENTID_SIGNUPS_VALID,
                    signupUser: 'someone-else',
                })
                .expect(constants.HTTP_STATUS_UNAUTHORIZED);

            expect(send)
                .not
                .toHaveBeenCalled();
        });
    });

    describe('GET /events/:id/signups/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/events/abc/signups/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /events/:id/signups/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200));

            await request(app.app)
                .patch('/api/events/abc/signups/abc')
                .send(PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
