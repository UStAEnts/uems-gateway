import { GatewayMk2 } from "../../Gateway";
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;

export class SystemGatewayInterface implements GatewayAttachmentInterface {

    generateInterfaces(send: GatewayMk2.SendRequestFunction): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        return [
            {
                action: 'get',
                path: '/status',
                handle: (req, res) => res.sendStatus(200),
            },
        ];
    }

}
