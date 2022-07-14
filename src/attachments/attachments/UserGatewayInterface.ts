import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { UserMessage } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import * as zod from 'zod';
import { AuthUtilities } from '../../utilities/AuthUtilities';
import { asana, copyKeysIfDefined, describe, endpoint, Method, tag, warn } from '../../decorators/endpoint';
import { UserValidators } from '@uems/uemscommlib/build/user/UserValidators';
import { Configuration } from '../../configuration/Configuration';
import ReadUserMessage = UserMessage.ReadUserMessage;
import UpdateUserMessage = UserMessage.UpdateUserMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import orProtect = AuthUtilities.orProtect;
import Attachment = GatewayMk2.Attachment;
import ZUser = UserValidators.ZUser;

type GetUserQuery = Partial<{
    email: string,
    id: string,
    name: string,
    username: string,
}>;

type PatchUserQuery = {
    name?: string,
    username?: string,
    email?: string,
    profile?: string,
    hash?: string,
};

export class UserGatewayInterface extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @warn('Permission management issues? ') // TODO
    @endpoint(
        Method.GET,
        ['user'],
        ['UserList', zod.array(ZUser)],
        undefined,
        zod.object({
            email: zod.string(),
            id: zod.string(),
            name: zod.string(),
            username: zod.string(),
        }).partial(),
    )
    @tag('user')
    @describe(
        'Queries users by the given properties',
        'This will allow you to query users by a range of properties. Emails will not be included unless '
        + 'you are a member of ops, ents or admin and queries by email will not be supported either',
    )
    public async queryUsersHandler(req: Request, res: Response, query: GetUserQuery, _: undefined) {
        const outgoing: ReadUserMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        copyKeysIfDefined([
            'id', 'name', 'username',
        ], query, outgoing);

        if (orProtect('ops', 'ents', 'admin')(req.kauth?.grant?.access_token)) {
            outgoing.includeEmail = true;
            if (query.email) outgoing.email = query.email;
        }

        const permittedKeys = [
            'name',
            'id',
            'username',
            'email',
        ];

        await this.send(
            ROUTING_KEY.user.read,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory((from: any[]) => {
                const result = from.map((e) => {
                    Object.keys(e)
                        .filter((k) => !permittedKeys.includes(k))
                        .forEach((k) => delete e[k]);
                    return e;
                });

                return {
                    status: 'success',
                    data: result,
                };
            }),
        );
    }

    @asana('0/0/1201549453029903/f')
    @endpoint(
        Method.GET,
        ['user', {
            key: 'id',
            description: 'The unique ID for this user',
        }],
        ['User', ZUser],
    )
    @tag('user')
    @describe(
        'Get a user',
        'Retrieves properties on a single user, emails will only be included if you are part of the ops, '
        + 'ents or admin groups',
    )
    public async getUserHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        const outgoingMessage: ReadUserMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            status: 0,
            userID: req.uemsUser.userID,
        };

        if (orProtect('ops', 'ents', 'admin')(req.kauth?.grant?.access_token)) {
            outgoingMessage.includeEmail = true;
        }

        await this.send(
            ROUTING_KEY.user.read,
            outgoingMessage,
            res,
            GenericHandlerFunctions.handleReadSingleResponseFactory(),
        );
    }

    // private createUserHandler(send: SendRequestFunction) {
    //     return async (req: Request, res: Response) => {
    //         const validate = MessageUtilities.verifyBody(
    //             req,
    //             res,
    //             ['name', 'username', 'email', 'hash'],
    //             {
    //                 name: (x) => typeof (x) === 'string',
    //                 username: (x) => typeof (x) === 'string',
    //                 email: (x) => typeof (x) === 'string',
    //                 hash: (x) => typeof (x) === 'string',
    //                 profile: (x) => typeof (x) === 'string',
    //             },
    //         );
    //
    //         if (!validate) {
    //             return;
    //         }
    //
    //         const outgoingMessage: CreateUserMessage = {
    //             msg_id: MessageUtilities.generateMessageIdentifier(),
    //             msg_intention: 'CREATE',
    //             id: req.body.username,
    //             status: 0,
    //             userID: req.uemsUser.userID,
    //             name: req.body.name,
    //             username: req.body.username,
    //             email: req.body.email,
    //             hash: req.body.hash,
    //         };
    //
    //         if (req.body.profile) outgoingMessage.profile = req.body.profile;
    //
    //         await send(
    //             ROUTING_KEY.user.create,
    //             outgoingMessage,
    //             res,
    //             GenericHandlerFunctions.handleDefaultResponseFactory(),
    //         );
    //     };
    // }

    @endpoint(
        Method.DELETE,
        ['user', {
            key: 'id',
            description: 'The unique ID for this user',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['admin'],
    )
    @tag('user')
    @describe(
        'Delete a user',
        'Purge a user from existence (in the system, living people are left unharmed). Only usable by '
        + 'admins and will only delete user metadata. Actual user credentials and login permissions should be managed '
        + 'through the associated keycloak or user management platform. If you delete a user their records will be '
        + 'regenerated from keycloak on their next login / authentication assertion',
    )
    public async deleteUserHandler(req: Request, res: Response, _0: undefined, _1: undefined) {
        if (this.resolver && this.handler) {
            await removeAndReply({
                assetID: req.params.id,
                assetType: 'user',
            }, this.resolver, this.handler, res);
        } else {
            res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
        }
    }

    @endpoint(
        Method.PATCH,
        ['user', {
            key: 'id',
            description: 'The unique ID for this user',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        undefined,
        undefined,
        zod.object({
            name: zod.string()
                .optional(),
            username: zod.string()
                .optional(),
            email: zod.string()
                .optional(),
            profile: zod.string()
                .optional(),
        }),
    )
    @tag('user')
    @describe(
        'Update user metadata',
        'This will update internal user metadata about the user. Some properties may be overwritten by '
        + 'keycloak syncing but for example profile should be safe. If you are admin you can change any user otherwise '
        + 'only yourself',
    )
    public async updateUserHandler(req: Request, res: Response, _: undefined, body: PatchUserQuery) {
        if (!orProtect('admin')(req.kauth?.grant?.access_token) && req.uemsUser.userID !== req.params.id) {
            res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
            return;
        }

        const outgoing: UpdateUserMessage = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'UPDATE',
            status: 0,
            userID: req.uemsUser.userID,
            id: req.params.id,
        };

        copyKeysIfDefined([
            'name', 'username', 'email', 'profile',
        ], body, outgoing);

        await this.send(
            ROUTING_KEY.user.update,
            outgoing,
            res,
            GenericHandlerFunctions.handleDefaultResponseFactory(),
        );
    }
}
