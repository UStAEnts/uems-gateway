import { GatewayMk2 } from '../../Gateway';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import { RequestHandler } from "express";
import utils from 'util';

export class SystemGatewayInterface implements GatewayAttachmentInterface {

    private static me(): RequestHandler {
        return (req, res) => {
            res.json({
                username: req.uemsUser.username,
                profile: req.uemsUser.profile,
                name: req.uemsUser.fullName,
                // TODO: is there a better way to do this?
                isOps: req.kauth?.grant?.access_token?.hasRole?.('ops') ?? false,
                isEnts: req.kauth?.grant?.access_token?.hasRole?.('ents') ?? false,
                isAdmin: req.kauth?.grant?.access_token?.hasRole?.('admin') ?? false,
            });
        };
    }

    generateInterfaces(): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        return [
            {
                action: 'get',
                path: '/whoami',
                handle: SystemGatewayInterface.me(),
                secure: [],
            },
        ];
    }
}
