import { Response } from 'jest-express/lib/response';
import express, { Request } from 'express';
import { GenericHandlerFunctions } from '../../src/attachments/GenericHandlerFunctions';
import handleDefaultResponseFactory = GenericHandlerFunctions.handleDefaultResponseFactory;
import { MsgStatus } from '@uems/uemscommlib';
import { MessageUtilities } from '../../src/utilities/MessageUtilities';
import handleReadSingleResponseFactory = GenericHandlerFunctions.handleReadSingleResponseFactory;

describe('GenericHandlerFunctions.ts', () => {
    describe('handleDefaultResponse', () => {
        it('should reject messages that don\'t have the valid success code', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            handleDefaultResponseFactory()(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.FAIL,
                    result: 'passes successfully',
                },
                MsgStatus.FAIL,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should accept normal messages with no transformer', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            handleDefaultResponseFactory()(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: 'passes successfully',
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(200);
            expect(response.body)
                .toEqual(MessageUtilities.wrapInSuccess('passes successfully'));
        });

        it('should accept normal messages with transformer', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleDefaultResponseFactory(
                (data) => ({
                    data: data.map((e) => (e as any).subObject),
                    status: 'success',
                }),
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: [{
                        subObject: 'passes successfully',
                    }],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(200);
            console.log(response.body);
            expect(response.body)
                .toEqual(MessageUtilities.wrapInSuccess(['passes successfully']));
        });

        it('should reject messages when the transformer throws an exception', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleDefaultResponseFactory(
                () => {
                    throw new Error('failed');
                },
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: [{
                        subObject: 'passes successfully',
                    }],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should reject messages when the transformer throws an exception asynchronously', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleDefaultResponseFactory(
                () => Promise.reject(new Error('failure')),
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: [{
                        subObject: 'passes successfully',
                    }],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });
    });

    describe('handleReadSingleResponse', () => {
        it('should reject messages that don\'t have the valid success code', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory()(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.FAIL,
                    result: 'passes successfully',
                },
                MsgStatus.FAIL,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should accept normal messages with no transformer', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory()(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: ['passes successfully'],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(200);
            expect(response.body)
                .toEqual(MessageUtilities.wrapInSuccess('passes successfully'));
        });

        it('should reject if array result is not 1 element', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory()(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: ['a', 'b', 'c'],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should reject messages when the transformer throws an exception', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory(
                () => {
                    throw new Error('failed');
                },
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: [{
                        subObject: 'passes successfully',
                    }],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should reject messages when the transformer throws an exception asynchronously', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory(
                () => Promise.reject(new Error('failure')),
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: [{
                        subObject: 'passes successfully',
                    }],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(500);
            expect(response.body)
                .toHaveProperty('status', 'FAILED');
            expect(response.body)
                .toHaveProperty('error');
        });

        it('should accept messages with valid transformers', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;

            await handleReadSingleResponseFactory(
                (data) => data,
            )(
                fake,
                0,
                {
                    msg_id: 0,
                    status: MsgStatus.SUCCESS,
                    result: ['passes successfully'],
                },
                MsgStatus.SUCCESS,
            );

            expect(response.statusCode)
                .toEqual(200);
            expect(response.body)
                .toEqual(MessageUtilities.wrapInSuccess('passes successfully'));
        });
    });
});
