import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { FileMessage, FileResponse, FileResponseValidator, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { FileValidators } from '@uems/uemscommlib/build/file/FileValidators';
import { EntityResolver } from '../../resolver/EntityResolver';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import FileReadSchema = FileMessage.ReadFileMessage;
import FileResponseSchema = FileValidators.FileResponseSchema;
import InternalFile = FileResponse.InternalFile;
import ShallowInternalFile = FileResponse.ShallowInternalFile;
import ReadFileMessage = FileMessage.ReadFileMessage;
import CreateFileMessage = FileMessage.CreateFileMessage;
import DeleteFileMessage = FileMessage.DeleteFileMessage;
import UpdateFileMessage = FileMessage.UpdateFileMessage;
import { Resolver } from "../Resolvers";

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
                handle: this.queryEventsHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'post',
                path: '/files',
                handle: this.createEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/files/:id',
                handle: this.deleteEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/files/:id',
                handle: this.getEventHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'patch',
                path: '/files/:id',
                handle: this.updateEventHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private queryEventsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
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
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveFiles(this._resolver)),
            );
        };
    }

    private getEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsJWT.userID,
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
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleFile(this._resolver)),
            );
        };
    }

    private createEventHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['name', 'filename', 'size', 'type', 'userid'],
                {
                    name: (x) => typeof (x) === 'string',
                    filename: (x) => typeof (x) === 'string',
                    size: (x) => typeof (x) === 'number',
                    type: (x) => typeof (x) === 'string',
                    userid: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateFileMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsJWT.userID,
                userid: req.body.userid,
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

    private deleteEventHandler(send: SendRequestFunction) {
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
                userID: req.uemsJWT.userID,
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

    private updateEventHandler(send: SendRequestFunction) {
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
                userID: req.uemsJWT.userID,
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
}
