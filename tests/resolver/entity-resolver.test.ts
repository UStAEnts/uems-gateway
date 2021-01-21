import { GatewayMk2 } from "../../src/Gateway";
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { EntityResolver } from "../../src/resolver/EntityResolver";
import { MsgStatus } from "@uems/uemscommlib";

jest.setTimeout(30000);

describe('EntityResolver.ts', () => {

    let publishPromise: Promise<[string, any]>;
    let publish: (key: string, value: any) => void;
    let handler: GatewayMessageHandler;
    let resolver: EntityResolver;

    beforeEach(() => {
        let resolvePromise: (data: any) => void;
        publishPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        const mockPublish = jest.fn();
        mockPublish.mockImplementation((key: string, value: any) => resolvePromise([key, value]));

        publish = mockPublish;

        handler = {
            publish,
        } as GatewayMessageHandler;
        resolver = new EntityResolver(handler);
    });

    afterEach(() => {
        resolver.stop();
    })

    it('should terminate requests after 10 seconds', async () => {
        const promise = resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        );

        const [key, message] = await publishPromise;
        expect(key)
            .toEqual('publish key');
        expect(resolver.intercept(message.msg_id))
            .toBeTruthy();
        // Now wait 15 seconds
        await expect(promise)
            .rejects
            .toThrowError('timed out');
        expect(resolver.intercept(message.msg_id))
            .toBeFalsy();
    });

    it('should reject messages with invalid codes', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        ))
            .rejects
            .toHaveProperty('status', MsgStatus.FAIL);

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.FAIL,
        });

        await promise;
    });

    it('should reject messages without results', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        ))
            .rejects
            .toHaveProperty('status', MsgStatus.SUCCESS);

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.SUCCESS,
        });

        await promise;
    });

    it('should reject results without an array result', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        ))
            .rejects
            .toThrowError('Result was not an array');

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.SUCCESS,
            result: 'something',
        });

        await promise;
    });

    it('should reject results without one element', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        ))
            .rejects
            .toThrowError('Result had too many or too few elements, expected 1 got 0');

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.SUCCESS,
            result: [],
        });

        await promise;
    });

    it('should apply middlewares before resolving', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
            (data) => data[0],
        ))
            .resolves
            .toEqual('data');

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.SUCCESS,
            result: [['data']],
        });

        await promise;
    });

    it('should return array elements normally', async () => {
        const promise = expect(resolver.resolve(
            'some fake ID',
            'publish key',
            'userid',
        ))
            .resolves
            .toEqual('data');

        const [, message] = await publishPromise;
        resolver.consume({
            msg_id: message.msg_id,
            status: MsgStatus.SUCCESS,
            result: ['data'],
        });

        await promise;
    });

})
