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
                // TODO: [https://app.asana.com/0/0/1201549453029903/f] requires specific secure rules
                //       need to figure out how to implement this one, will have to be done on the service via comms
                //       as we just pass an ID on thisrather than identities.
            },
        ];
    }

    private querySignupsHandler(send: SendRequestFunction) {
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
            if (!MessageUtilities.has(req.params, 'eventID')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter eventID',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

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
            if (!MessageUtilities.has(req.params, 'eventID')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter eventID',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            // TODO: this is not verifying the right hting?
            const validate = MessageUtilities.verifyBody(
                req,
                res,
                ['role'],
                {
                    role: (x) => typeof (x) === 'string',
                    signupUser: (x) => typeof (x) === 'string' || typeof (x) === 'undefined',
                },
            );

            if (!validate) {
                return;
            }

            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                if (req.params.signupUser !== req.uemsUser.userID) {
                    // Signing up another user, mu for now
                    if (!orProtect('admin')(req.kauth.grant.access_token)) {
                        res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                        return;
                    }
                    // Signing up themselves, must be an ent or an admin
                } else if (!orProtect('ents', 'admin')(req.kauth.grant.access_token)) {
                    res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                    return;
                }
            } else {
                res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                return;
            }

            const outgoingMessage: CreateSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.uemsUser.userID,
                eventID: req.params.eventID,
                signupUser: req.params.signupUser,
                role: req.body.role,
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
            if (!MessageUtilities.has(req.params, 'eventID')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter eventID',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
                if (req.params.signupUser !== req.uemsUser.userID) {
                    // Removing another user, must be an admin for now
                    if (!orProtect('admin')(req.kauth.grant.access_token)) {
                        res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                        return;
                    }
                    // Removing themselves, must be an ent or an admin
                } else if (!orProtect('ents', 'admin')(req.kauth.grant.access_token)) {
                    res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                    return;
                }
            } else {
                res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
                return;
            }

            if (this._resolver && this.handler) {
                await removeAndReply({
                    assetID: req.params.id,
                    assetType: 'signup',
                }, this._resolver, this.handler, res);
            } else {
                res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                    .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            }
            // const outgoingMessage: DeleteSignupMessage = {
            //     msg_id: MessageUtilities.generateMessageIdentifier(),
            //     msg_intention: 'DELETE',
            //     status: 0,
            //     userID: req.uemsUser.userID,
            //     id: req.params.id,
            // };
            //
            // await send(
            //     ROUTING_KEY.signups.delete,
            //     outgoingMessage,
            //     res,
            //     GenericHandlerFunctions.handleReadSingleResponseFactory(),
            // );
        };
    }

    private updateSignupHandler(send: SendRequestFunction) {
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

            if (!MessageUtilities.has(req.params, 'id')) {
                res
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: 'missing parameter id',
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return;
            }

            const outgoing: UpdateSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'UPDATE',
                status: 0,
                userID: req.uemsUser.userID,
                id: req.params.id,
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
