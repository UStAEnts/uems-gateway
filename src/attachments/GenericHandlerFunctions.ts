import { Response } from 'express';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { MsgStatus } from '@uems/uemscommlib';
import { constants } from 'http2';
import { ErrorCodes } from '../constants/ErrorCodes';
import { GatewayMk2 } from '../Gateway';
import MinimalMessageType = GatewayMk2.MinimalMessageType;

function handleDefaultResponse<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }>(
    http: Response,
    timestamp: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: SHALLOW[]) => DEEP[] | Promise<DEEP[]>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (transformer) {
            Promise.resolve(transformer(response.result))
                .then((data) => {
                    http
                        .status(constants.HTTP_STATUS_OK)
                        .json(MessageUtilities.wrapInSuccess(data));
                })
                .catch((err) => {
                    console.error('Transformer failed when handling default response', err);
                    http
                        .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                });
        } else {
            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result));
        }
    } else {
        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }
}

function handleReadSingleResponse<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }>(
    http: Response,
    time: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: SHALLOW) => DEEP | Promise<DEEP>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (response.result.length !== 1) {
            console.warn('Failing response because an invalid number of results, expected 1 got',
                response.result.length);
            http
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return;
        }

        if (transformer) {
            Promise.resolve(transformer(response.result[0]))
                .then((data) => {
                    http
                        .status(constants.HTTP_STATUS_OK)
                        .json(MessageUtilities.wrapInSuccess(data));
                })
                .catch((err) => {
                    console.error('Transformer failed when handling default response', err);
                    http
                        .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                });
        } else {
            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result[0]));
        }
    } else {
        console.warn('Response is failing because status was', status, 'when', MsgStatus.SUCCESS, 'was expected');
        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }
}

export namespace GenericHandlerFunctions {

    export type Transformer<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }> = (data: SHALLOW[]) => DEEP[] | Promise<DEEP[]>;
    export type SingleTransformer<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }> = (data: SHALLOW) => DEEP | Promise<DEEP>;

    export function handleDefaultResponseFactory<S, D, T extends { result: any[] }>(
        transformer?: Transformer<S, D, T>,
    ) {
        return (
            http: Response,
            timestamp: number,
            raw: MinimalMessageType,
            status: number,
        ) => handleDefaultResponse(http, timestamp, raw, status, transformer);
    }

    export function handleReadSingleResponseFactory<S, D, T extends { result: any[] }>(
        transformer?: SingleTransformer<S, D, T>,
    ) {
        return (
            http: Response,
            time: number,
            raw: MinimalMessageType,
            status: number,
        ) => handleReadSingleResponse(http, time, raw, status, transformer);
    }

}
