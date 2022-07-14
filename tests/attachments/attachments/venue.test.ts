import { VenueGatewayInterface } from '../../../src/attachments/attachments/VenueGatewayInterface';
import { GET_VENUES_INVALID, GET_VENUES_VALID, PATCH_VENUES_VENUEID_INVALID, PATCH_VENUES_VENUEID_VALID, POST_VENUES_INVALID, POST_VENUES_MISSING, POST_VENUES_VALID } from '../../test-api-data';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import request from 'supertest';
import { constants } from 'http2';
import { MsgStatus } from '@uems/uemscommlib';

describe('VenueGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, {
        resolveUser: () => ({}),
    } as any, null as any, null as any, [
        VenueGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /venues', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/venues')
                .query(GET_VENUES_INVALID)
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
                .get('/api/venues')
                .query(GET_VENUES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /venues/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/venues/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /venues', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/venues')
                .send(POST_VENUES_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/venues')
                .send(POST_VENUES_INVALID)
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
                .post('/api/venues')
                .send(POST_VENUES_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
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
            await request(app.app)
                .patch('/api/venues/id')
                .send(PATCH_VENUES_VENUEID_INVALID)
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
                .patch('/api/venues/abc')
                .send(PATCH_VENUES_VENUEID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
