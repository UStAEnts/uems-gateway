import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { SignupMessage, SignupResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Resolver } from '../Resolvers';
import { Constants } from '../../utilities/Constants';
import { removeAndReply } from '../DeletePipelines';
import { ErrorCodes } from '../../constants/ErrorCodes';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadSignupMessage = SignupMessage.ReadSignupMessage;
import SignupReadSchema = SignupMessage.ReadSignupMessage;
import CreateSignupMessage = SignupMessage.CreateSignupMessage;
import UpdateSignupMessage = SignupMessage.UpdateSignupMessage;
import ROUTING_KEY = Constants.ROUTING_KEY;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { AuthUtilities } from "../../utilities/AuthUtilities";
import orProtect = AuthUtilities.orProtect;
import * as zod from 'zod';
import sendZodError = MessageUtilities.sendZodError;

export class SignupGatewayInterface implements GatewayAttachmentInterface {

    private _resolver!: EntityResolver;
    private handler?: GatewayMessageHandler;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this._resolver = resolver;
        this.handler = handler;

        const validator = new SignupResponseValidator();

        return [
            {
                action: 'get',
                path: '/events/:eventID/signups',
                handle: this.querySignupsHandler(send),
                additionalValidator: validator,
                secure: ['ents'],
            },
            {
                action: 'post',
                path: '/events/:eventID/signups',
                handle: this.createSignupHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'delete',
                path: '/events/:eventID/signups/:id',
                handle: this.deleteSignupHandler(send),
                additionalValidator: validator,
            },
            {
                action: 'get',
                path: '/events/:eventID/signups/:id',
                handle: this.getSignupHandler(send),
                additionalValidator: validator,
                secure: ['ents', 'admin'],
                // TODO: [https://app.asana.com/0/0/1201549453029903/f] should event owners be able to see the
                //       techs assigned?
            },
            {
                action: 'patch',
                path: '/events/:eventID/signups/:id',
                handle: this.updateSignupHandler(send),
                additionalValidator: validator,
            },
        ];
    }

    private querySignupsHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoing: ReadSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
            };

            const validate = MessageUtilities.coerceAndVerifyQuery(
                req,
                res,
                [],
                {
                    id: { primitive: 'string' },
                    date: { primitive: 'number' },
                    userid: { primitive: 'string' },
                    dateRangeBegin: { primitive: 'number' },
                    dateRangeEnd: { primitive: 'number' },
                    role: { primitive: 'string' },
                },
            );

            if (!validate) {
                return;
            }

            const parameters = req.query;
            const validProperties: (keyof SignupReadSchema)[] = [
                'id',
                'date',
                'signupUser',
                'dateRangeBegin',
                'dateRangeEnd',
                'role',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.signups.read,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveSignups(
                    this._resolver,
                    req.uemsUser.userID,
                    false,
                )),
            );
        };
    }

    private getSignupHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            const outgoingMessage: ReadSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
                id: req.params.id,
            };

            await send(
                ROUTING_KEY.signups.read,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleSignup(
                    this._resolver,
                    req.uemsUser.userID,
                    true,
                )),
            );
        };
    }

    private createSignupHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                if (req.params.signupUser && req.params.signupUser !== req.uemsUser.userID) {
                    // Signing up another user, mu for now
                    if (!orProtect('admin')(req.kauth.grant.access_token)) {
                        res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                            .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
                        return;
                    }
                    // Signing up themselves, must be an ent or an admin
                } else if (!orProtect('ents', 'admin')(req.kauth.grant.access_token)) {
                    res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                        .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
                    return;
                }
            } else {
                res.status(constants.HTTP_STATUS_UNAUTHORIZED)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.PERMISSION));
                return;
            }

            const validate = zod.object({
                role: zod.string(),
                signupUser: zod.string().optional(),
            }).safeParse(req.body);

            if (!validate.success) {
                sendZodError(res, validate.error);
                return;
            }
            const body = validate.data;

            const outgoingMessage: CreateSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
                signupUser: body.signupUser,
                role: body.role,
            };

            await send(
                ROUTING_KEY.signups.create,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }

    private deleteSignupHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                // req.kauth.grant.kauth
                if (orProtect('ops', 'ents', 'admin')(req.kauth.grant.access_token)) localOnly = false;
            }

            if (this._resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'signup',
                }, this._resolver, this.handler, res, localOnly);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
        };
    }

    private updateSignupHandler(send: SendRequestFunction) {
        return async (req: Request, res: Response) => {
            let localOnly = true;
            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                if (orProtect('admin')(req.kauth.grant.access_token)) {
                    localOnly = false;
                }
            }

            const outgoing: UpdateSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
                localOnly,
            };

            const parameters = req.body;
            const validProperties: (keyof UpdateSignupMessage)[] = [
                'role',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                ROUTING_KEY.signups.update,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
