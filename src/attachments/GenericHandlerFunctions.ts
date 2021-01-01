import { Response } from 'express';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { MsgStatus } from '@uems/uemscommlib';
import { constants } from 'http2';
import { ErrorCodes } from '../constants/ErrorCodes';
import { GatewayMk2 } from '../Gateway';
import MinimalMessageType = GatewayMk2.MinimalMessageType;

function handleDefaultResponse<T extends { result: any[] }>(
    http: Response,
    timestamp: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: T['result']) => any | Promise<any>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as T;

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
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    } else {
        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }
}

function handleReadSingleResponse<T extends { result: any[] }>(
    http: Response,
    time: number,
    raw: MinimalMessageType,
    status: number,
    transformer?: (data: T['result'][number]) => any | Promise<any>,
) {
    MessageUtilities.identifierConsumed(raw.msg_id);
    const response = raw as T;

    if (status === MsgStatus.SUCCESS) {
        if (response.result.length !== 1) {
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
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    } else {
        http
            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
    }
}

export namespace GenericHandlerFunctions {

    export type Transformer<T extends { result: any[] }> = (data: T['result']) => any | Promise<any>;

    export function handleDefaultResponseFactory<T extends { result: any[] }>(
        transformer?: (data: T['result']) => any | Promise<any>,
    ) {
        return (
            http: Response,
            timestamp: number,
            raw: MinimalMessageType,
            status: number,
        ) => handleDefaultResponse(http, timestamp, raw, status, transformer);
    }

    export function handleReadSingleResponseFactory<T extends { result: any[] }>(
        transformer?: (data: T['result'][number]) => any | Promise<any>,
    ) {
        return (
            http: Response,
            time: number,
            raw: MinimalMessageType,
            status: number,
        ) => handleReadSingleResponse(http, time, raw, status, transformer);
    }

}
