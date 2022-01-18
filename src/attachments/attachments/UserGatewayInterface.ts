import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { UserMessage, UserResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { Constants } from '../../utilities/Constants';
import { EntityResolver } from '../../resolver/EntityResolver';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadUserMessage = UserMessage.ReadUserMessage;
import CreateUserMessage = UserMessage.CreateUserMessage;
import UpdateUserMessage = UserMessage.UpdateUserMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import * as zod from 'zod';
import sendZodError = MessageUtilities.sendZodError;
import { AuthUtilities } from "../../utilities/AuthUtilities";
import orProtect = AuthUtilities.orProtect;

export class UserGatewayInterface implements GatewayAttachmentInterface {

    private resolver?: EntityResolver;
    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const validator = new UserResponseValidator();
        this.resolver = resolver;
        this.handler = handler;

        return [
            {
                action: 'get',
                path: '/user',
                handle: this.queryUsersHandler(send),
                additionalValidator: validator,
            },
            // {
            //     action: 'post',
            //     path: '/user',
            //     handle: this.createUserHandler(send),
            //     additionalValidator: validator,
            //     secure: ['admin'],
            // },
            {
                action: 'delete',
                path: '/user/:id',
                handle: this.deleteUserHandler(send),
                additionalValidator: validator,
                secure: ['admin'],
            },
            {
                action: 'get',
                path: '/user/:id',
                handle: this.getUserHandler(send),
                additionalValidator: validator,
                // TODO: [https://app.asana.com/0/0/1201549453029903/f] requires specific secure rules
                //       what data should normal users be able to get?
            },
            {
                action: 'patch',
                path: '/user/:id',
                handle: this.updateUserHandler(send),
                additionalValidator: validator,
                secure: ['admin'],
            },
        ];
    }

    // TODO: permission management on query
    private queryUsersHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            const validate = MessageUtilities.coerceAndVerifyQuery(
                req,
                res,
                [],
                {
                    email: { primitive: 'string' },
                    id: { primitive: 'string' },
                    name: { primitive: 'string' },
                    username: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

            const parameters = req.query;
            const validProperties: string[] = [
                'id',
                'name',
                'username',
                'email',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            if (orProtect('ops', 'ents', 'admin')(req.kauth?.grant?.access_token)) outgoing.includeEmail = true;

            const permittedKeys = [
                'name',
                'id',
                'username',
                'email',
            ];

            await send(
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
        };
    }

    private getUserHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
            };

            await send(
                ROUTING_KEY.user.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
        };
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

    private deleteUserHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (this.resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'user',
                }, this.resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateUserHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const validate = zod.object({
                name: zod.string()
                    .optional(),
                username: zod.string()
                    .optional(),
                email: zod.string()
                    .optional(),
                profile: zod.string()
                    .optional(),
                hash: zod.string()
                    .optional(),
            })
                .safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }

            const outgoing: UpdateUserMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
            };

            const parameters = req.body;
            const validProperties: string[] = [
                'name',
                'username',
                'email',
                'hash',
                'profile',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.user.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
