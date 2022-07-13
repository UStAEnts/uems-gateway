import { GatewayMk2 } from '../../Gateway';
import { Request, Response } from 'express';
import { describe, endpoint, Method, tag } from '../../decorators/endpoint';
import { z } from 'zod';
import Attachment = GatewayMk2.Attachment;
import { EntityResolver } from '../../resolver/EntityResolver';
import { Configuration } from '../../configuration/Configuration';

export class SystemGatewayInterface extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.GET,
        ['whoami'],
        ['Whoami', z.object({
            username: z.string(),
            profile: z.string(),
            name: z.string(),
        }), 'override'],
    )
    @tag('system')
    @describe(
        'Self introspection',
        'Details of your user account, unfortunately less philosophical answer',
    )
    public async me(req: Request, res: Response, _0: undefined, _1: undefined) {
        res.json({
            username: req.uemsUser.username,
            profile: req.uemsUser.profile,
            name: req.uemsUser.fullName,
        });
    }

    @endpoint(
        Method.GET,
        ['features'],
        ['FeatureConfig', z.object({
            equipment: z.boolean(),
            ops: z.boolean(),
        }), 'override'],
    )
    @tag('system')
    @describe(
        'Get the supported features',
        'UEMS is packed of features but not all of them are quite ready yet! This endpoint returns which '
        + 'features are currently enabled and exposed to users and which are hidden only in the backend. This only '
        + 'modifies what the frontend should render - all features are available through the API!',
    )
    public async getSupportedFeatures(req: Request, res: Response, _0: undefined, _1: undefined){
        // TODO: make this config based / user based
        res.json({
            equipment: false,
            ops: false,
        });
    }
}
