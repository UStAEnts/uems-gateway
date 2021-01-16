import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { FileBindingMessage, FileMessage, FileResponse, FileResponseValidator, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { FileValidators } from '@uems/uemscommlib/build/file/FileValidators';
import { EntityResolver } from '../../resolver/EntityResolver';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import FileReadSchema = FileMessage.ReadFileMessage;
import FileResponseSchema = FileValidators.FileResponseSchema;
import ReadFileMessage = FileMessage.ReadFileMessage;
import CreateFileMessage = FileMessage.CreateFileMessage;
import DeleteFileMessage = FileMessage.DeleteFileMessage;
import UpdateFileMessage = FileMessage.UpdateFileMessage;
import { Resolver } from "../Resolvers";
import QueryByEventMessage = FileBindingMessage.QueryByEventMessage;
import QueryByFileMessage = FileBindingMessage.QueryByFileMessage;
import BindFilesToEventMessage = FileBindingMessage.BindFilesToEventMessage;
import UnbindFilesFromEventMessage = FileBindingMessage.UnbindFilesFromEventMessage;

export class FileGatewayInterface implements GatewayAttachmentInterface {
    private readonly FILE_CREATE_KEY = 'file.details.create';

    private readonly FILE_DELETE_KEY = 'file.details.delete';

    private readonly FILE_UPDATE_KEY = 'file.details.update';

    public static readonly FILE_READ_KEY = 'file.details.get';

    private _resolver!: EntityResolver;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this._resolver = resolver;

        const validator = new FileResponseValidator();

        return [
            {
                action: 'get',
                path: '/files',
                handle: this.queryFilesHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/files',
                handle: this.createFileHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/files/:id',
                handle: this.deleteFileHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/files/:id',
                handle: this.getFileHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/files/:id',
                handle: this.updateFileHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/files/:id/events',
                handle: this.getEventsByFileHandler(send),
                // TODO: add validator
            },
            {
                action: 'get',
                path: '/events/:id/files',
                handle: this.getFilesByEventsHandler(send),
                // TODO: add validator
            },
            {
                action: 'post',
                path: '/events/:id/files',
                handle: this.postFileToEventHandler(send),
            },
            {
                action: 'delete',
                path: '/events/:eventID/files/:fileID',
                handle: this.deleteFileFromEventHandler(send),
            },
        ];
    }

    private queryFilesHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            const parameters = req.query;
            const validProperties: (keyof FileReadSchema)[] = [
                'id',
                'name',
                'filename',
                'size',
                'type',
                'date',
                'userid',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                FileGatewayInterface.FILE_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveFiles(
                    this._resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private getFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            outgoingMessage.id = req.params.id;
            await send(
                FileGatewayInterface.FILE_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleFile(
                    this._resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private createFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['name', 'filename', 'size', 'type'],
                {
                    name: (x) => typeof (x) === 'string',
                    filename: (x) => typeof (x) === 'string',
                    size: (x) => typeof (x) === 'number',
                    type: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                userid: req.uemsUser.userID,
                name: req.body.name,
                filename: req.body.filename,
                size: req.body.size,
                type: req.body.type,
            };

            await send(
                this.FILE_CREATE_KEY,
                outgoingMessage,
                res,
                async (http, timestamp, raw, status) => {
                    MessageUtilities.identifierConsumed(raw.msg_id);
                    const response = raw as FileResponseSchema;

                    if (status === MsgStatus.SUCCESS) {
                        http
                            .status(constants.HTTP_STATUS_OK)
                            .json({
                                status: 'OK',
                                result: response.result,
                                uploadURI: response.uploadURI,
                            });
                    } else {
                        http
                            .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
                    }
                },
            );
        };
    }

    private deleteFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }
            const outgoingMessage: DeleteFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            await send(
                this.FILE_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
    }

    private updateFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoing: UpdateFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            const parameters = req.body;
            const validProperties: (keyof FileReadSchema)[] = [
                'name',
                'type',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                this.FILE_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventsByFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoingMessage: QueryByFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                fileID: req.params.id,
            };

            await send(
                'file.events.read',
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEventsForFileBinding(
                    this._resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private getFilesByEventsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoingMessage: QueryByEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.id,
            };

            await send(
                'file.events.read',
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveFilesForFileBinding(
                    this._resolver,
                    req.uemsUser.userID,
                )),
            );
        };
    }

    private postFileToEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['fileID'],
                {
                    fileID: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: BindFilesToEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.id,
                fileIDs: [req.body.fileID],
            };

            await send(
                'file.events.read',
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteFileFromEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (!MessageUtilities.has(req.params, 'eventID')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter eventID',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }
            if (!MessageUtilities.has(req.params, 'fileID')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter fileID',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoingMessage: UnbindFilesFromEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
                fileIDs: [req.params.fileID],
            };

            await send(
                'file.events.read',
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
