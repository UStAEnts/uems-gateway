import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { FileBindingMessage, FileMessage, MsgStatus } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { AuthUtilities } from "../../utilities/AuthUtilities";
import * as zod from 'zod';
import { FileValidators } from "@uems/uemscommlib/build/file/FileValidators";
import { Configuration } from "../../configuration/Configuration";
import { asNumber, copyKeysIfDefined, describe, endpoint, mapKeysIfDefined, Method, tag, warn } from "../../decorators/endpoint";
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import FileReadSchema = FileMessage.ReadFileMessage;
import ReadFileMessage = FileMessage.ReadFileMessage;
import CreateFileMessage = FileMessage.CreateFileMessage;
import UpdateFileMessage = FileMessage.UpdateFileMessage;
import QueryByEventMessage = FileBindingMessage.QueryByEventMessage;
import QueryByFileMessage = FileBindingMessage.QueryByFileMessage;
import BindFilesToEventMessage = FileBindingMessage.BindFilesToEventMessage;
import UnbindFilesFromEventMessage = FileBindingMessage.UnbindFilesFromEventMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import orProtect = AuthUtilities.orProtect;
import sendZodError = MessageUtilities.sendZodError;
import FileModifyResponse = FileValidators.FileModifyResponse;
import Attachment = GatewayMk2.Attachment;
import ZFile = FileValidators.ZFile;
import { EventValidators } from "@uems/uemscommlib/build/event/EventValidators";
import ZEvent = EventValidators.ZEvent;

type GetFilesHandlerQuery = Partial<{
    date: number,
    filename: string,
    id: string,
    name: string,
    size: number,
    type: string,
    userid: string,
    sizeGreater: number,
    sizeLess: number,
}>;

type PostFileBody = {
    name: string,
    filename: string,
    size: number,
    type: string,
};

type PatchFileBody = {
    name: string,
    type: string,
};

export class FileGatewayInterface extends Attachment {

    constructor(resolver: EntityResolver, handler: GatewayMk2.GatewayMessageHandler, send: GatewayMk2.SendRequestFunction, config: Configuration) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.GET,
        ['files'],
        ['UEMSFileList', zod.array(ZFile)],
        undefined,
        zod.object({
            date: asNumber(),
            filename: zod.string(),
            id: zod.string(),
            name: zod.string(),
            size: asNumber(),
            type: zod.string(),
            userid: zod.string(),
            sizeGreater: asNumber(),
            sizeLess: asNumber(),
        })
            .partial(),
    )
    @tag('file')
    @describe(
        'Search for files',
        'Return files matching the given query',
    )
    private async queryFilesHandler(req: Request, res: Response, query: GetFilesHandlerQuery, _: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const outgoing: ReadFileMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            userScoped: localOnly,
        };

        copyKeysIfDefined([
            'id',
            'name',
            'filename',
            'size',
            'type',
            'date',
        ], query, outgoing);

        mapKeysIfDefined({
            userid: 'owner',
        }, query, outgoing);

        if (query.sizeGreater || query.sizeLess) {
            outgoing.size = {
                less: query.sizeLess,
                greater: query.sizeGreater,
            };
        }

        await this.send(
            ROUTING_KEY.file.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveFiles(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.GET,
        ['files', {
            key: 'id',
            description: 'The unique ID for the files',
        }],
        ['UEMSFile', ZFile],
    )
    @tag('file')
    @describe(
        'Get a single file',
        'Returns properties for a single file entry',
    )
    private async getFileHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const outgoingMessage: ReadFileMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
            userScoped: localOnly,
        };

        await this.send(
            ROUTING_KEY.file.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleFile(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.POST,
        ['files'],
        ['FileCreateReply', zod.object({
            status: zod.literal('OK'),
            result: zod.array(zod.string()),
            uploadURI: zod.string(),
        }), 'override'],
        undefined,
        undefined,
        zod.object({
            name: zod.string(),
            filename: zod.string(),
            size: zod.number(),
            type: zod.string(),
        }),
    )
    @tag('file')
    @describe(
        'Add a new file entry',
        'This will create a new file entry without any associated content. The actual file upload will '
        + 'take place separately through the returned upload URI to which you should upload the actual content of '
        + 'the file. The result of this call is to createa  file metadata entry only. If you do not upload a file '
        + 'within a certain time frame, the metadata record will be automatically deleted so it is recommended you '
        + 'upload the file immediately after.',
    )
    private async createFileHandler(req: Request, res: Response, _: undefined, body: PostFileBody) {
        const outgoingMessage: CreateFileMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            name: body.name,
            filename: body.filename,
            size: body.size,
            type: body.type,
            date: Math.floor(Date.now() / 1000),
            owner: req.uemsUser.userID,
            downloadURL: 'pending',
            checksum: 'pending',
            mime: 'pending',
        };

        await this.send(
            ROUTING_KEY.file.create,
            outgoingMessage,
            res,
            async (http, timestamp, raw, status) => {
                MessageUtilities.identifierConsumed(raw.msg_id);
                const response = raw as FileModifyResponse;

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
    }

    @endpoint(
        Method.DELETE,
        ['files', {
            key: 'id',
            description: 'The unique identifier for this file',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
    )
    @tag('file')
    @describe(
        'Delete a file',
        'This will remove a file from the system providing no other objects are currently depending on it',
    )
    private async deleteFileHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'file',
            }, this.resolver, this.handler, res);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.PATCH,
        ['files', {
            key: 'id',
            description: 'The unique identifier for this file',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
        undefined,
        zod.object({
            name: zod.string(),
            type: zod.string(),
        }),
    )
    @tag('file')
    @describe(
        'Update a file',
        'Update the name and type of a file currently in the system',
    )
    private async updateFileHandler(req: Request, res: Response, _: undefined, body: PatchFileBody) {
        const outgoing: UpdateFileMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined(['name', 'type'], body, outgoing);

        await this.send(
            ROUTING_KEY.file.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.GET,
        ['files', {
            key: 'id',
            description: 'The unique identifier for this file',
        }, 'events'],
        ['EventList', zod.array(ZEvent)],
    )
    @tag('file', 'event')
    @describe(
        'Get all events associated with a file',
        'Returns all events which have been bound with this file',
    )
    private async getEventsByFileHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const outgoingMessage: QueryByFileMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            fileID: req.params.id,
            userScoped: localOnly,
        };

        await this.send(
            ROUTING_KEY.fileBinding.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveEventsForFileBinding(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.GET,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }, 'files'],
        ['UEMSFileList', zod.array(ZFile)],
    )
    @tag('event', 'file')
    @describe(
        'Get all files for an event',
        'Returns all files associated with a given event',
    )
    private async getFilesByEventsHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const outgoingMessage: QueryByEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
            eventID: req.params.id,
            userScoped: localOnly,
        };

        await this.send(
            ROUTING_KEY.fileBinding.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveFilesForFileBinding(
                this.resolver,
                req.uemsUser.userID,
            )),
        );
    }

    @endpoint(
        Method.POST,
        ['events', {
            key: 'id',
            description: 'The unique identifier for this event',
        }, 'files'],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            fileID: zod.string(),
        }),
    )
    @tag('file', 'event')
    @describe(
        'Link a file to an event',
        'Links a file by ID to the event ID specified in the path',
    )
    private async postFileToEventHandler(req: Request, res: Response, _: undefined, body: { fileID: string }) {
        let localOnly = true;
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
        }

        const outgoingMessage: BindFilesToEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'CREATE',
            status: 0,
            userID: req.uemsUser.userID,
            eventID: req.params.id,
            fileIDs: [body.fileID],
            userScoped: localOnly,
        };

        await this.send(
            ROUTING_KEY.fileBinding.create,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }

    @endpoint(
        Method.DELETE,
        ['events', {
            key: 'eventID',
            description: 'The unique identifier for the event',
        }, 'files', {
            key: 'fileID',
            description: 'The unique ID for this file',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'admin'],
    )
    @tag('event', 'file')
    @describe(
        'Unlink a file an event',
        'Removes any link between this file and event if one exists',
    )
    private async deleteFileFromEventHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: UnbindFilesFromEventMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'DELETE',
            status: 0,
            userID: req.uemsUser.userID,
            eventID: req.params.eventID,
            fileIDs: [req.params.fileID],
        };

        await this.send(
            ROUTING_KEY.fileBinding.delete,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    };
}
