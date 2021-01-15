import { GatewayMk2 } from '../../Gateway';
import GatewayAttachmentInterface = GatewayMk2.GatewayAttachmentInterface;

export class SystemGatewayInterface implements GatewayAttachmentInterface {

    generateInterfaces(): GatewayMk2.GatewayInterfaceActionType[] | Promise<GatewayMk2.GatewayInterfaceActionType[]> {
        const response = process.env.npm_package_version ?? '0.0.1';
        return [
            {
                action: 'get',
                path: '/status',
                handle: (req, res) => res.status(200)
                    .send(`OK ${response}`),
                secure: false,
            },
        ];
    }

}
