import { SystemGatewayInterface } from '../../../src/attachments/system/SystemGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { Response } from 'jest-express/lib/response';
import express from 'express';
import { MOCK_UEMS_USER, request } from '../../test-api-data';
import { AttachmentFunction } from "../../utils";

describe('SystemGatewayInterface.ts', () => {
    let routes: {
        'get.whoami': AttachmentFunction,
    };

    beforeAll(async () => {
        const entries = new SystemGatewayInterface(null as any, null as any, null as any, null as any);

        routes = {
            'get.whoami': entries.me,
        };
    });

    describe('GET /whoami', () => {
        it('sends a valid response', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            const req = request();

            await routes['get.whoami'](req, fake, undefined, undefined);

            expect(response.body)
                .toHaveProperty('name', MOCK_UEMS_USER.fullName);
            expect(response.body)
                .toHaveProperty('profile', MOCK_UEMS_USER.profile);
            expect(response.body)
                .toHaveProperty('username', MOCK_UEMS_USER.username);
        });
    });
});
