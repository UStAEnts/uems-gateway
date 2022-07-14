import { GatewayMk2 } from "../src/Gateway";
import GatewayInterfaceActionType = GatewayMk2.GatewayInterfaceActionType;
import { Response } from "jest-express/lib/response";
import express, { Application, Request } from "express";
import { GET_VENUES_INVALID, request } from "./test-api-data";
import { constants } from "http2";

export type AttachmentFunction = (req: Request, res: express.Response, query: any, body: any) => Promise<void>;

export async function testParameterTypes(
    app: Application,
    route: string,
    method: string,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
) {
    const response = new Response();
    const fake = response as unknown as express.Response;
    const req = request(
        route,
        method,
        location === 'query' ? data : undefined,
        location === 'body' ? data : undefined,
        params,
    );
    await app(req, response as any);
    // await route(req, fake, location === 'query' ? data : undefined, location === 'body' ? data : undefined);

    // if (send.mock.calls.length !== 0) {
        console.warn(response);
    // }
    expect(send)
        .not
        .toHaveBeenCalled();
    expect(response.statusCode)
        .toEqual(constants.HTTP_STATUS_BAD_REQUEST);
    console.log(response.body);
    expect(JSON.stringify(response.body)
        .includes('type') || JSON.stringify(response.body)
        .includes('format'))
        .toBeTruthy();
}

export async function testMissingParameters(
    route: AttachmentFunction,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
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
    await route(req, fake, location === 'query' ? data : undefined, location === 'body' ? data : undefined);

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

export async function testRouteWithoutSend(
    route: AttachmentFunction,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
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
    await route(req, fake, location === 'query' ? data : undefined, location === 'body' ? data : undefined);

    return response;
}

export async function testValidRoute(
    route: AttachmentFunction,
    data: any,
    location: 'query' | 'body',
    send: jest.Mock,
    params?: any,
    skipChild: boolean = false,
    roles?: string[],
    comparisonData?: any,
) {
    const response = new Response();
    const fake = response as unknown as express.Response;
    const req = request(
        location === 'query' ? data : undefined,
        location === 'body' ? data : undefined,
        params,
        roles,
    );
    await route(req, fake, location === 'query' ? data : undefined, location === 'body' ? data : undefined);


    if (send.mock.calls.length !== 1) {
        console.warn(response);
    }

    expect(send)
        .toHaveBeenCalledTimes(1);
    if (data !== undefined && !skipChild) {
        expect(send.mock.calls[0][1])
            .toEqual(expect.objectContaining(comparisonData ?? data));
    }
    return response;
}
