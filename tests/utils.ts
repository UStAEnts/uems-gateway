import { GatewayMk2 } from "../src/Gateway";
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { Response } from "jest-express/lib/response";
import express from "express";
import { GET_VENUES_INVALID, request } from "./test-api-data";
import { constants } from "http2";

export async function testParameterTypes(
    route: GatewayInterfaceActionType,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
) {
    const response = new Response();
    const fake = response as unknown as express.Response;
    const req = request(
        location === 'query' ? data : undefined,
        location === 'body' ? data : undefined,
        params,
    );
    await route.handle(req, fake, () => false);

    if (send.mock.calls.length !== 0) {
        console.warn(response);
    }
    expect(send)
        .not
        .toHaveBeenCalled();
    expect(response.statusCode)
        .toEqual(constants.HTTP_STATUS_BAD_REQUEST);
    expect(JSON.stringify(response.body))
        .toContain('type');
}

export async function testMissingParameters(
    route: GatewayInterfaceActionType,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
) {
    const response = new Response();
    const fake = response as unknown as express.Response;
    const req = request(
        location === 'query' ? data : undefined,
        location === 'body' ? data : undefined,
        params,
    );
    await route.handle(req, fake, () => false);

    if (send.mock.calls.length !== 0) {
        console.warn(response);
    }

    expect(send)
        .not
        .toHaveBeenCalled();
    expect(response.statusCode)
        .toEqual(constants.HTTP_STATUS_BAD_REQUEST);
    expect(JSON.stringify(response.body))
        .toContain('missing');
}

export async function testValidRoute(
    route: GatewayInterfaceActionType,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
    skipChild: boolean = false,
    roles?: string[],
) {
    const response = new Response();
    const fake = response as unknown as express.Response;
    const req = request(
        location === 'query' ? data : undefined,
        location === 'body' ? data : undefined,
        params,
        roles,
    );
    await route.handle(req, fake, () => false);

    if (send.mock.calls.length !== 1) {
        console.warn(response);
    }

    expect(send)
        .toHaveBeenCalledTimes(1);
    if (data !== undefined && !skipChild) {
        expect(send.mock.calls[0][1])
            .toEqual(expect.objectContaining(data));
    }
}
