import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { MessageUtilities } from '../../utilities/MessageUtilities';
import { constants } from 'http2';
import { MsgStatus, SignupMessage, SignupResponseValidator } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from '../GenericHandlerFunctions';
import { ErrorCodes } from '../../constants/ErrorCodes';
import { SignupValidators } from '@uems/uemscommlib/build/signup/SignupValidators';
import { EntityResolver } from '../../resolver/EntityResolver';
import { Resolver } from "../Resolvers";
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import SendRequestFunction = GatewayMk2.SendRequestFunction;
import ReadSignupMessage = SignupMessage.ReadSignupMessage;
import SignupResponseSchema = SignupValidators.SignupResponseSchema;
import SignupReadSchema = SignupMessage.ReadSignupMessage;
import CreateSignupMessage = SignupMessage.CreateSignupMessage;
import DeleteSignupMessage = SignupMessage.DeleteSignupMessage;
import UpdateSignupMessage = SignupMessage.UpdateSignupMessage;
import SignupUpdateSchema = SignupValidators.SignupUpdateSchema;

export class SignupGatewayInterface implements GatewayAttachmentInterface {
    private readonly SIGNUP_CREATE_KEY = 'events.signups.create';

    private readonly SIGNUP_DELETE_KEY = 'events.signups.delete';

    private readonly SIGNUP_UPDATE_KEY = 'events.signups.update';

    public static readonly SIGNUP_READ_KEY = 'events.signups.get';

    private _resolver!: EntityResolver;

    generateInterfaces(
        send: GatewayMk2.SendRequestFunction,
        resolver: EntityResolver,
    ): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        this._resolver = resolver;

        const validator = new SignupResponseValidator();

        return [
            {
                action: 'get',
                path: '/events/:eventID/signups',
                handle: this.querySignupsHandler(send),
                additionalValidator: validator,
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
                userID: req.oidc.user.sub,
                eventID: req.params.eventID,
            };

            const parameters = req.query;
            const validProperties: (keyof SignupReadSchema)[] = [
                'id',
                'date',
                'userid',
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
                SignupGatewayInterface.SIGNUP_READ_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(Resolver.resolveSignups(
                    this._resolver,
                    req.oidc.user.sub,
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
                userID: req.oidc.user.sub,
                eventID: req.params.eventID,
                id: req.params.id,
            };

            await send(
                SignupGatewayInterface.SIGNUP_READ_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(Resolver.resolveSingleSignup(
                    this._resolver,
                    req.oidc.user.sub,
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

            const validate = MessageUtilities.verifyParameters(
                req,
                res,
                ['role'],
                {
                    role: (x) => typeof (x) === 'string',
                },
            );

            if (!validate) {
                return;
            }

            const outgoingMessage: CreateSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'CREATE',
                status: 0,
                userID: req.oidc.user.sub,
                eventID: req.params.eventID,
                userid: req.oidc.user.sub,
                role: req.body.role,
            };

            await send(
                this.SIGNUP_CREATE_KEY,
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
            const outgoingMessage: DeleteSignupMessage = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'DELETE',
                status: 0,
                userID: req.oidc.user.sub,
                id: req.params.id,
            };

            await send(
                this.SIGNUP_DELETE_KEY,
                outgoingMessage,
                res,
                GenericHandlerFunctions.handleReadSingleResponseFactory(),
            );
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
                userID: req.oidc.user.sub,
                id: req.params.id,
            };

            const parameters = req.body;
            const validProperties: (keyof SignupUpdateSchema)[] = [
                'role',
            ];

            validProperties.forEach((key) => {
                if (MessageUtilities.has(parameters, key)) {
                    // @ts-ignore
                    outgoing[key] = parameters[key];
                }
            });

            await send(
                this.SIGNUP_UPDATE_KEY,
                outgoing,
                res,
                GenericHandlerFunctions.handleDefaultResponseFactory(),
            );
        };
    }
}
