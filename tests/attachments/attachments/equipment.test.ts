import { EquipmentGatewayInterface } from '../../../src/attachments/attachments/EquipmentGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { GET_ENTS_INVALID, GET_ENTS_VALID, GET_EQUIPMENT_INVALID, GET_EQUIPMENT_VALID, PATCH_EQUIPMENT_EQUIPMENTID_INVALID, PATCH_EQUIPMENT_EQUIPMENTID_VALID, POST_EQUIPMENT_INVALID, POST_EQUIPMENT_MISSING, POST_EQUIPMENT_VALID } from '../../test-api-data';
import {  testMissingParameters, testParameterTypes, testValidRoute } from '../../utils';
import { ExpressApplication } from "../../../src/express/ExpressApplication";
import request from "supertest";
import { constants } from "http2";
import { MsgStatus } from "@uems/uemscommlib";
// import {Resolver} from '../../../src/attachments/Resolvers';

jest.mock('../../../src/attachments/Resolvers', () => {
    return {
        Resolver: {
            resolveEquipments: (data: any) => (() => ({
                status: 'success',
                data,
            })),
            resolveSingleEquipment: (data: any) => (() => ({
                status: 'success',
                data,
            })),
        },
    };
});

describe('EquipmentGatewayInterface.ts', () => {
    const send = jest.fn();
    const app = new ExpressApplication(null as any, null as any);
    app.attach(send, null as any, null as any, null as any, [
        EquipmentGatewayInterface,
    ]);

    beforeEach(() => {
        send.mockReset();
    });

    describe('GET /equipment', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .get('/api/equipment')
                .query(GET_EQUIPMENT_INVALID)
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
                .get('/api/equipment')
                .query(GET_EQUIPMENT_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('POST /equipment', () => {
        it('rejects on missing parameters', async () => {
            await request(app.app)
                .post('/api/equipment')
                .send(POST_EQUIPMENT_MISSING)
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

            expect(send)
                .not
                .toHaveBeenCalled();
        });

        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .post('/api/equipment')
                .send(POST_EQUIPMENT_INVALID)
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
                .post('/api/equipment')
                .send(POST_EQUIPMENT_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    // describe('DELETE /equipment/:id', () => {
    //     it('sends on a valid message', async () => {
    //         await testValidRoute(
    //             routes['delete.equipment.id'],
    //             undefined,
    //             'body',
    //             send,
    //             { id: 'abc' },
    //         );
    //     });
    // });

    describe('GET /equipment/:id', () => {
        it('sends on a valid message', async () => {
            send.mockImplementation((_0, _1, res, cb) => cb(res, 0, {
                msg_id: 0,
                status: MsgStatus.SUCCESS,
                result: [{}],
            }, 200));

            await request(app.app)
                .get('/api/equipment/abc')
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });

    describe('PATCH /equipment/:id', () => {
        it('rejects on wrong parameter types', async () => {
            await request(app.app)
                .patch('/api/equipment/abc')
                .send(PATCH_EQUIPMENT_EQUIPMENTID_INVALID)
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
                .patch('/api/equipment/abc')
                .send(PATCH_EQUIPMENT_EQUIPMENTID_VALID)
                .expect(200);

            expect(send)
                .toHaveBeenCalled();
        });
    });
});
