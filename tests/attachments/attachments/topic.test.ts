import { GET_TOPICS_INVALID, GET_TOPICS_VALID, PATCH_TOPICS_TOPICID_INVALID, PATCH_TOPICS_TOPICID_VALID, POST_TOPICS_INVALID, POST_TOPICS_MISSING, POST_TOPICS_VALID } from '../../test-api-data';
import { ExpressApplication } from '../../../src/express/ExpressApplication';
import { EntStateGatewayInterface } from '../../../src/attachments/attachments/EntStateGatewayInterface';
import request from 'supertest';
import { constants } from 'http2';
import { MsgStatus } from '@uems/uemscommlib';
import { TopicGatewayInterface } from '../../../src/attachments/attachments/TopicGatewayInterface';

describe('TopicGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        TopicGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /topics', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/topics')
                .query(GET_TOPICS_INVALID)
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
                .get('/api/topics')
                .query(GET_TOPICS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /topics', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/topics')
                .send(POST_TOPICS_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/topics')
                .send(POST_TOPICS_INVALID)
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
                .post('/api/topics')
                .send(POST_TOPICS_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    // describe('DELETE /topics/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.topics.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /topics/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/topics/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /topics/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .patch('/api/topics/abc')
                .send(PATCH_TOPICS_TOPICID_INVALID)
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
                .patch('/api/topics/abc')
                .send(PATCH_TOPICS_TOPICID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
