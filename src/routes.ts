import { EquipmentGatewayInterface } from './attachments/attachments/EquipmentGatewayInterface';
import { EntStateGatewayInterface } from './attachments/attachments/EntStateGatewayInterface';
import { GatewayMk2 } from './Gateway';
import Attachment = GatewayMk2.Attachment;
import { EventGatewayAttachment } from './attachments/attachments/EventGatewayAttachment';
import { FileGatewayInterface } from './attachments/attachments/FileGatewayInterface';
import { SignupGatewayInterface } from './attachments/attachments/SignupGatewayInterface';
import { StateGatewayInterface } from './attachments/attachments/StateGatewayInterface';
import { TopicGatewayInterface } from './attachments/attachments/TopicGatewayInterface';
import { UserGatewayInterface } from './attachments/attachments/UserGatewayInterface';
import { VenueGatewayInterface } from './attachments/attachments/VenueGatewayInterface';
import { SystemGatewayInterface } from "./attachments/system/SystemGatewayInterface";

const ROUTES: (typeof Attachment)[] = [
    EquipmentGatewayInterface,
    EntStateGatewayInterface,
    EventGatewayAttachment,
    FileGatewayInterface,
    SignupGatewayInterface,
    StateGatewayInterface,
    TopicGatewayInterface,
    UserGatewayInterface,
    VenueGatewayInterface,
    SystemGatewayInterface,
];

export default ROUTES;
