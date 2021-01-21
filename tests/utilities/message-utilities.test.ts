import { MessageUtilities } from '../../src/utilities/MessageUtilities';
import { Response } from 'jest-express/lib/response';
import express from 'express';
import { Request } from 'jest-express/lib/request';
import generateMessageIdentifier = MessageUtilities.generateMessageIdentifier;
import identifierConsumed = MessageUtilities.identifierConsumed;
import has = MessageUtilities.has;
import verifyData = MessageUtilities.verifyData;
import coerceAndVerifyQuery = MessageUtilities.coerceAndVerifyQuery;

describe('MessageUtilities.ts', () => {
    describe('generateMessageIdentifier // identifierConsumed', () => {
        it('should error when it cannot generate identifiers', async () => {
            // Overwrite to force a specific value
            jest.spyOn(global.Math, 'random')
                .mockReturnValue(0.4);

            // One should be generated
            generateMessageIdentifier();

            // The other should fail
            expect(() => generateMessageIdentifier())
                .toThrowError(/unable to generate/ig);

            jest.spyOn(global.Math, 'random')
                .mockRestore();
        });

        it('should prevent generating duplicates', async () => {
            // One should be generated
            const id = generateMessageIdentifier();

            // Then we want to force this number to be generated again, in theory is should skip it
            jest.spyOn(global.Math, 'random')
                // This relies on implementation, likely to break?
                .mockReturnValueOnce(id / 100000);

            // Then we expect it not to equal because it should not reuse the value
            expect(generateMessageIdentifier())
                .not
                .toEqual(id);

            jest.spyOn(global.Math, 'random')
                .mockRestore();
        });

        it('should allow generating duplicate once consumed', async () => {
            // One should be generated
            const id = generateMessageIdentifier();

            // Then we want to force this number to be generated again, in theory is should skip it
            jest.spyOn(global.Math, 'random')
                // This relies on implementation, likely to break?
                .mockReturnValueOnce(id / 100000);

            // Then we expect it not to equal because it should not reuse the value
            expect(generateMessageIdentifier())
                .not
                .toEqual(id);

            // Then we consume it
            identifierConsumed(id);

            // Force the generator back to that value
            jest.spyOn(global.Math, 'random')
                // This relies on implementation, likely to break?
                .mockReturnValueOnce(id / 100000);

            // And it should generate the same one
            expect(generateMessageIdentifier())
                .toEqual(id);

            jest.spyOn(global.Math, 'random')
                .mockRestore();
        });
    });

    describe('has', () => {
        it('should support null and undefined objects', async () => {
            expect(has(null, 'abc'))
                .toBeFalsy();
            expect(has(undefined, 'abc'))
                .toBeFalsy();
        });

        it('should support null and undefined tests', async () => {
            // @ts-ignore
            expect(has({ id: 1 }, undefined))
                .toBeFalsy();
            // @ts-ignore
            expect(has({ id: 2 }, null))
                .toBeFalsy();
        });

        it('should return correct results', async () => {
            expect(has({
                id: 1,
                3: 4,
            }, 'id'))
                .toBeTruthy();
            expect(has({
                id: 2,
                4: 5,
            }, 4))
                .toBeTruthy();
        });
    });

    describe('verifyData', () => {
        it('should detect missing keys', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(verifyData({}, fake, ['abc']))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'BAD_REQUEST_MISSING_PARAM');
        });

        it('should reject bad validators', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(verifyData({ id: 4 }, fake, [], { id: (x) => typeof (x) === 'string' }))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'BAD_REQUEST_INVALID_PARAM');
        });

        it('should handle validators throwing errors', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(verifyData({ id: 4 }, fake, [], {
                id: () => {
                    throw new Error('invalid');
                },
            }))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'INTERNAL_SERVER_ERROR');
        });

        it('should approve valid results', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(verifyData({ id: '4' }, fake, [], { id: (x) => typeof (x) === 'string' }))
                .toBeTruthy();
            expect(response.headersSent)
                .toBeFalsy();
        });
    });

    describe('coerceAndVerifyData', () => {
        it('should detect missing keys', async () => {
            const request = new Request('/');
            request.query = {};

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(request as unknown as express.Request, fake, ['abc']))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'BAD_REQUEST_MISSING_PARAM');
        });

        it('support string types', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'something',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'string' },
                },
            ))
                .toBeTruthy();
        });

        it('should support string types with additional validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'something',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'string',
                        validator: (x) => x === 'something',
                    },
                },
            ))
                .toBeTruthy();
        });

        it('should support string types with failing validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'something',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'string',
                        validator: (x) => {
                            throw new Error('something');
                        },
                    },
                },
            ))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'INTERNAL_SERVER_ERROR');
        });

        it('should support numbers, inserting into query', async () => {
            const request = new Request('/');
            request.query = {
                abc: '123',
            };
            expect(typeof (request.query.abc))
                .toEqual('string');

            let response = new Response();
            let fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'number' },
                },
            ))
                .toBeTruthy();
            expect(typeof (request.query.abc))
                .toEqual('number');

            request.query = {
                abc: 'wrong',
            };
            response = new Response();
            fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'number' },
                },
            ))
                .toBeFalsy();
        });

        it('should support numbers with additional validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: '123',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'number',
                        validator: (x) => x === 123,
                    },
                },
            ))
                .toBeTruthy();
        });

        it('should support numbers with failing validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: '123',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'number',
                        validator: () => {
                            throw new Error('something');
                        },
                    },
                },
            ))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'INTERNAL_SERVER_ERROR');
        });

        it('should support arrays', async () => {
            const request = new Request('/');
            request.query = {
                abc: ['abc'],
            };

            let response = new Response();
            let fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'array' },
                },
            ))
                .toBeTruthy();

            request.query = { abc: 'something' };
            response = new Response();
            fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'array' },
                },
            ))
                .toBeFalsy();
        });

        it('should support arrays with additional validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: ['abc'],
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'array',
                        validator: (x) => x[0] === 'abc',
                    },
                },
            ))
                .toBeTruthy();
        });

        it('should support arrays with failing validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: ['123'],
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'array',
                        validator: () => {
                            throw new Error('something');
                        },
                    },
                },
            ))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'INTERNAL_SERVER_ERROR');
        });

        it('should support booleans, inserting back into query', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'true',
            };
            expect(typeof (request.query.abc))
                .toEqual('string');

            let response = new Response();
            let fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'boolean' },
                },
            ))
                .toBeTruthy();
            expect(typeof (request.query.abc))
                .toEqual('boolean');

            // Invalid values

            request.query = {
                abc: 'wrong',
            };
            response = new Response();
            fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: { primitive: 'boolean' },
                },
            ))
                .toBeFalsy();
        });

        it('should support booleans with additional validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'false',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'boolean',
                        validator: (x) => x === false,
                    },
                },
            ))
                .toBeTruthy();
        });

        it('should support booleans with failing validators', async () => {
            const request = new Request('/');
            request.query = {
                abc: 'false',
            };

            const response = new Response();
            const fake = response as unknown as express.Response;
            expect(coerceAndVerifyQuery(
                request as unknown as express.Request,
                fake,
                ['abc'],
                {
                    abc: {
                        primitive: 'boolean',
                        validator: () => {
                            throw new Error('something');
                        },
                    },
                },
            ))
                .toBeFalsy();
            expect(response.body)
                .toHaveProperty(['error', 'code'], 'INTERNAL_SERVER_ERROR');
        });
    });
});
