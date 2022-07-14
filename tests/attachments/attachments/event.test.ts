import { GET_EVENTS_INVALID, GET_EVENTS_VALID, PATCH_EVENTS_EVENTID_INVALID, PATCH_EVENTS_EVENTID_VALID, POST_EVENTS_EVENTID_COMMENTS_INVALID, POST_EVENTS_EVENTID_COMMENTS_MISSING, POST_EVENTS_EVENTID_COMMENTS_VALID, POST_EVENTS_INVALID, POST_EVENTS_MISSING, POST_EVENTS_VALID } from '../../test-api-data';
import { ExpressApplication } from "../../../src/express/ExpressApplication";
import { EntStateGatewayInterface } from "../../../src/attachments/attachments/EntStateGatewayInterface";
import request from "supertest";
import { constants } from "http2";
import { MsgStatus } from "@uems/uemscommlib";
import { EventGatewayAttachment } from "../../../src/attachments/attachments/EventGatewayAttachment";
import { resolveEventsFlow } from "../../../src/flows/EventResolveFlow";
import { MessageUtilities } from "../../../src/utilities/MessageUtilities";

jest.mock('../../../src/flows/EventResolveFlow', () => {
    const original = jest.requireActual('../../../src/flows/EventResolveFlow');
    return {
        resolveEventsFlow: () => (h:any, _0:any, r:any) => {
            h.status(200).json(MessageUtilities.wrapInSuccess(r));
        },
    };
});
jest.mock('../../../src/attachments/Resolvers', () => {
    return {
        Resolver: {
            resolveSingleEvent: (data: any) => (() => ({
                status: 'success',
                data,
            })),
            resolveComments: (data: any) => (() => ({
                status: 'success',
                data,
            })),
        },
    };
});
describe('EventGatewayAttachment.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        EventGatewayAttachment,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('POST /events', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/events')
                .send(POST_EVENTS_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/events')
                .send(POST_EVENTS_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .post('/api/events')
                .send(POST_EVENTS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /events', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/events')
                .query(GET_EVENTS_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .get('/api/events')
                .query(GET_EVENTS_VALID)
                .expect((r) => console.log(r.body))
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /events/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200, trans));

            await request(app.app)
                .get('/api/events/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /events/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .patch('/api/events/abc')
                .send(PATCH_EVENTS_EVENTID_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .patch('/api/events/abc')
                .send(PATCH_EVENTS_EVENTID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    // describe('DELETE /events/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.events.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /states/:id/events', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .get('/api/states/abc/events')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /venues/:id/events', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .get('/api/venues/abc/events')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('GET /events/:id/comments', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .get('/api/events/abc/comments')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /events/:id/comments', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/events/abc/comments')
                .send(POST_EVENTS_EVENTID_COMMENTS_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/events/abc/comments')
                .send(POST_EVENTS_EVENTID_COMMENTS_INVALID)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb, trans) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [],
            }, 200, trans));

            await request(app.app)
                .post('/api/events/abc/comments')
                .send(POST_EVENTS_EVENTID_COMMENTS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
