import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { FileBindingMessage, FileMessage, FileResponse, FileResponseValidator, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import FileReadSchema = FileMessage.ReadFileMessage;
import ReadFileMessage = FileMessage.ReadFileMessage;
import CreateFileMessage = FileMessage.CreateFileMessage;
import UpdateFileMessage = FileMessage.UpdateFileMessage;
import QueryByEventMessage = FileBindingMessage.QueryByEventMessage;
import QueryByFileMessage = FileBindingMessage.QueryByFileMessage;
import BindFilesToEventMessage = FileBindingMessage.BindFilesToEventMessage;
import UnbindFilesFromEventMessage = FileBindingMessage.UnbindFilesFromEventMessage;
import FileResponseMessage = FileResponse.FileResponseMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { AuthUtilities } from "../../utilities/AuthUtilities";
import orProtect = AuthUtilities.orProtect;

export class FileGatewayInterface implements GatewayAttachmentInterface {

    private _resolver!: EntityResolver;
    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this._resolver = resolver;
        this.handler = handler;

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
                secure: ['ops', 'admin'],
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
                secure: ['ops', 'admin'],
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
                secure: ['ops', 'admin'],
            },
        ];
    }

    private queryFilesHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const outgoing: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                localOnly,
            };

            const validate = MessageUtilities.coerceAndVerifyQuery(
                req,
                res,
                [],
                {
                    date: { primitive: 'number' },
                    filename: { primitive: 'string' },
                    id: { primitive: 'string' },
                    name: { primitive: 'string' },
                    size: { primitive: 'number' },
                    type: { primitive: 'string' },
                    userid: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

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
                ROUTING_KEY.file.read,
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
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const outgoingMessage: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
                localOnly,
            };

            await send(
                ROUTING_KEY.file.read,
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
            const validate = MessageUtilities.verifyBody(
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
                name: req.body.name,
                filename: req.body.filename,
                size: req.body.size,
                type: req.body.type,
            };

            await send(
                ROUTING_KEY.file.create,
                outgoingMessage,
                res,
                async (http, timestamp, raw, status) => {
                    MessageUtilities.identifierConsumed(raw.msg_id);
                    const response = raw as FileResponseMessage;

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
            if (this._resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'file',
                }, this._resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: UpdateFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            // TODO: no type validation here
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
                ROUTING_KEY.file.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private getEventsByFileHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const outgoingMessage: QueryByFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                fileID: req.params.id,
                localOnly,
            };

            await send(
                ROUTING_KEY.fileBinding.read,
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
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const outgoingMessage: QueryByEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.id,
                localOnly,
            };

            await send(
                ROUTING_KEY.fileBinding.read,
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
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            const validate = MessageUtilities.verifyBody(
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
                localOnly,
            };

            await send(
                ROUTING_KEY.fileBinding.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    // TODO: document on stoplight
    private deleteFileFromEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: UnbindFilesFromEventMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
                fileIDs: [req.params.fileID],
            };

            await send(
                ROUTING_KEY.fileBinding.delete,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
