import { SystemGatewayInterface } from '../../../src/attachments/system/SystemGatewayInterface';
import { GatewayMk2 } from '../../../src/Gateway';
import { Response } from 'jest-express/lib/response';
import express from 'express';
import { MOCK_UEMS_USER, request } from '../../test-api-data';
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;

describe('SystemGatewayInterface.ts', () => {
    let routes: {
        'get.whoami': GatewayInterfaceActionType,
        'get.status': GatewayInterfaceActionType,
    };

    beforeAll(async () => {
        const entries = await new SystemGatewayInterface().generateInterfaces();

        routes = {
            'get.whoami': entries
                .find((e) => e.action === 'get' && e.path === '/whoami') as GatewayInterfaceActionType,
            'get.status': entries
                .find((e) => e.action === 'get' && e.path === '/status') as GatewayInterfaceActionType,
        };
    });

    describe('GET /status', () => {
        it('sends valid response', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            const req = request();

            await routes['get.status'].handle(req, fake, () => undefined);

            expect(response.body)
                .toMatch(/OK [0-9]+\.[0-9]+\.[0-9]+/);
        });
    });

    describe('GET /whoami', () => {
        it('sends a valid response', async () => {
            const response = new Response();
            const fake = response as unknown as express.Response;
            const req = request();

            await routes['get.whoami'].handle(req, fake, () => undefined);

            expect(response.body)
                .toHaveProperty('name', MOCK_UEMS_USER.fullName);
            expect(response.body)
                .toHaveProperty('profile', MOCK_UEMS_USER.profile);
            expect(response.body)
                .toHaveProperty('username', MOCK_UEMS_USER.username);
        });
    });
});
