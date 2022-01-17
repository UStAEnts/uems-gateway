import { Response } from 'express';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { MsgStatus } from '@uems/uemscommlib';
import { constants } from 'http2';
import { ErrorCodes } from '../constants/ErrorCodes';
import { GatewayMk2 } from '../Gateway';
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import { LogIdentifier, logInfo, logResolve } from "../log/RequestLogger";

function handleDefaultResponse<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }>(
    http: Response,
    timestamp: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: SHALLOW[], requestID: LogIdentifier) => DEEP[] | Promise<DEEP[]>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (transformer) {
            try {
                return Promise.resolve(transformer(response.result, http.req.requestID))
                    .then((data) => {
                        logResolve(http.req.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(data));

                        http
                            .status(constants.HTTP_STATUS_OK)
                            .json(MessageUtilities.wrapInSuccess(data));
                    })
                    .catch((err) => {
                        console.error('Transformer failed when handling default response', err);
                        logInfo(http.req.requestID, `Transformer failed when handling default response: ${err.message}`);
                        logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                    });
            } catch (e) {
                console.error('Transformer failed when handling default response', e);
                logInfo(http.req.requestID, `Transformer failed when handling default response: ${e.message}`);
                logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        } else {
            logResolve(http.req.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result));

            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result));
        }
    } else {
        logInfo(http.req.requestID, `Expected SUCCESS (${MsgStatus.SUCCESS}) but got ${status}`);
        logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }

    return Promise.resolve();
}

function handleReadSingleResponse<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }>(
    http: Response,
    time: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: SHALLOW, requestID: LogIdentifier) => DEEP | Promise<DEEP>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (response.result.length !== 1) {
            console.warn('Failing response because an invalid number of results, expected 1 got',
                response.result.length);

            logInfo(http.req.requestID, `Expected 1 result, got ${response.result.length}.`);
            logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

            http
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return Promise.resolve();
        }

        if (transformer) {
            try {
                return Promise.resolve(transformer(response.result[0], http.req.requestID))
                    .then((data) => {
                        logResolve(http.req.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result[0]));

                        http
                            .status(constants.HTTP_STATUS_OK)
                            .json(MessageUtilities.wrapInSuccess(data));
                    })
                    .catch((err) => {
                        console.error('Transformer failed when handling default response', err);

                        logInfo(http.req.requestID, `Transformer failed ${err.message}.`);
                        logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                    });
            } catch (e) {
                console.error('Transformer failed when handling default response', e);

                logInfo(http.req.requestID, `Transformer failed ${e.message}.`);
                logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        } else {
            logResolve(http.req.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result[0]));

            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result[0]));
        }
    } else {
        console.warn('Response is failing because status was', status, 'when', MsgStatus.SUCCESS, 'was expected');

        logInfo(http.req.requestID, `Expected SUCCESS (${MsgStatus.SUCCESS}) but got ${status}`);
        logResolve(http.req.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }

    return Promise.resolve();
}

export namespace GenericHandlerFunctions {

    export type Transformer<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }> = (data: SHALLOW[], requestID: LogIdentifier) => DEEP[] | Promise<DEEP[]>;
    export type SingleTransformer<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }> = (data: SHALLOW, requestID: LogIdentifier) => DEEP | Promise<DEEP>;

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
