import { Response } from 'express';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { MsgStatus } from '@uems/uemscommlib';
import { constants } from 'http2';
import { ErrorCodes } from '../constants/ErrorCodes';
import { GatewayMk2 } from '../Gateway';
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import { LogIdentifier, logInfo, logResolve } from "../log/RequestLogger";
import Transformer = GenericHandlerFunctions.Transformer;
import SingleTransformer = GenericHandlerFunctions.SingleTransformer;

function handleDefaultResponse<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }>(
    http: Response,
    timestamp: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: Transformer<SHALLOW, DEEP, RESULT>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (transformer) {
            try {
                return Promise.resolve(transformer(response.result, http.requestID))
                    .then((data) => {
                        logResolve(http.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(data));

                        if (data.status === 'success') {
                            http
                                .status(constants.HTTP_STATUS_OK)
                                .json(MessageUtilities.wrapInSuccess(data.data));
                        } else {
                            http
                                .status(constants.HTTP_STATUS_OK)
                                .json(MessageUtilities.wrapInPartial(data.data));
                        }
                    })
                    .catch((err) => {
                        console.error('Transformer failed when handling default response', err);
                        logInfo(http.requestID, `Transformer failed when handling default response: ${err.message}`);
                        logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                    });
            } catch (e) {
                console.error('Transformer failed when handling default response', e);
                logInfo(http.requestID, `Transformer failed when handling default response: ${e.message}`);
                logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        } else {
            logResolve(http.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result));

            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result));
        }
    } else {
        logInfo(http.requestID, `Expected SUCCESS (${MsgStatus.SUCCESS}) but got ${status}`);
        logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

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
    transformer?: SingleTransformer<SHALLOW, DEEP, RESULT>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as RESULT;

    if (status === MsgStatus.SUCCESS) {
        if (response.result.length !== 1) {
            console.warn('Failing response because an invalid number of results, expected 1 got',
                response.result.length);

            logInfo(http.requestID, `Expected 1 result, got ${response.result.length}.`);
            logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

            http
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            return Promise.resolve();
        }

        if (transformer) {
            try {
                return Promise.resolve(transformer(response.result[0], http.requestID))
                    .then((data) => {
                        logResolve(http.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result[0]));

                        http
                            .status(constants.HTTP_STATUS_OK)
                            .json(MessageUtilities.wrapInSuccess(data));
                    })
                    .catch((err) => {
                        console.error('Transformer failed when handling default response', err);

                        logInfo(http.requestID, `Transformer failed ${err.message}.`);
                        logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                    });
            } catch (e) {
                console.error('Transformer failed when handling default response', e);

                logInfo(http.requestID, `Transformer failed ${e.message}.`);
                logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

                http
                    .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        } else {
            logResolve(http.requestID, constants.HTTP_STATUS_OK, MessageUtilities.wrapInSuccess(response.result[0]));

            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(response.result[0]));
        }
    } else {
        console.warn('Response is failing because status was', status, 'when', MsgStatus.SUCCESS, 'was expected');

        logInfo(http.requestID, `Expected SUCCESS (${MsgStatus.SUCCESS}) but got ${status}`);
        logResolve(http.requestID, constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, MessageUtilities.wrapInFailure(ErrorCodes.FAILED));

        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }

    return Promise.resolve();
}

export namespace GenericHandlerFunctions {

    export type Transformer<SHALLOW, DEEP, RESULT extends { result: SHALLOW[] }> = (data: SHALLOW[], requestID: LogIdentifier) => { status: 'success' | 'partial', data: DEEP[] } | Promise<{ status: 'success' | 'partial', data: DEEP[] }>;
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
