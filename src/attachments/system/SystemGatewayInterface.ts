import { GatewayMk2 } from '../../Gateway';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;
import { RequestHandler } from "express";

export class SystemGatewayInterface implements GatewayAttachmentInterface {

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

    private static me(): RequestHandler {
        return (req, res) => {
            res.json({
                username: req.uemsUser.username,
                profile: req.uemsUser.profile,
                name: req.uemsUser.fullName,
            });
        };
    }
}
