import { GatewayMk2 } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { VenueGatewayInterface } from '../attachments/attachments/VenueGatewayInterface';
import { UserGatewayInterface } from '../attachments/attachments/UserGatewayInterface';
import { EntStateGatewayInterface } from '../attachments/attachments/EntStateGatewayInterface';
import { EquipmentGatewayInterface } from '../attachments/attachments/EquipmentGatewayInterface';
import { StateGatewayInterface } from '../attachments/attachments/StateGatewayInterface';
import { EntStateResponse, EquipmentResponse, EventResponse, FileResponse, StateResponse, UserResponse, VenueResponse } from '@uems/uemscommlib';
import { EVENT_DETAILS_SERVICE_TOPIC_GET } from '../attachments/attachments/EventGatewayAttachment';
import { FileGatewayInterface } from '../attachments/attachments/FileGatewayInterface';
import { _byFile } from '../log/Log';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import InternalEntState = EntStateResponse.InternalEntState;
import InternalEquipment = EquipmentResponse.InternalEquipment;
import InternalState = StateResponse.InternalState;
import InternalUser = UserResponse.InternalUser;
import InternalVenue = VenueResponse.InternalVenue;
import ShallowInternalEquipment = EquipmentResponse.ShallowInternalEquipment;
import ShallowInternalVenue = VenueResponse.ShallowInternalVenue;
import ShallowInternalEvent = EventResponse.ShallowInternalEvent;
import InternalEvent = EventResponse.InternalEvent;
import InternalFile = FileResponse.InternalFile;
import ShallowInternalFile = FileResponse.ShallowInternalFile;

const _l = _byFile(__filename);

export class EntityResolver {
    private _handler: GatewayMessageHandler;

    constructor(handler: GatewayMk2.GatewayMessageHandler) {
        this._handler = handler;
    }

    public resolve<T>(id: string, key: string, userID: string, middleware?: (value: any) => T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const query = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                userID,
                id,
            };

            const stack = new Error();
            const name = `${query.msg_id} of READ for ${key}`;

            const callback = (result: any): any => {
                if (!Array.isArray(result)) {
                    _l.warn(`got result for ${name} which was not an array so rejecting the resolution`, { result });
                    reject(new Error('Result was not an array'));
                    return;
                }

                if (result.length !== 1) {
                    _l.warn(`got result for ${name} which had too many elements, got ${result.length}`);
                    _l.warn('Stack trace', { stack });
                    reject(new Error(`Result had too many or too few elements, expected 1 got ${result.length}`));
                    return;
                }

                _l.debug(`request for ${name} resolved successfully`);

                if (middleware) {
                    resolve(middleware(result[0]));
                } else {
                    resolve(result[0]);
                }
            };

            this._handler.interceptResponseCallback(query.msg_id, callback, reject);
            _l.debug(`publishing request for :: ${query.msg_id} of READ for ${key}`);

            this._handler.publish(key, query);
        });
    }

    public resolveEntState = (id: string, userID: string): Promise<InternalEntState> => this
        .resolve(id, EntStateGatewayInterface.ENT_STATE_READ_KEY, userID);

    public resolveEquipment = async (id: string, userID: string): Promise<InternalEquipment> => {
        // Load the equipment
        const shallowEquipment: ShallowInternalEquipment = await this.resolve(
            id,
            EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
            userID,
        );

        // Then resolve the user
        const output: InternalEquipment = {
            ...shallowEquipment,
            manager: await this.resolve<InternalUser>(
                shallowEquipment.manager,
                UserGatewayInterface.USER_READ_KEY,
                userID,
            ),
            location: await this.resolve<InternalVenue>(
                shallowEquipment.location,
                VenueGatewayInterface.VENUE_READ_KEY,
                userID,
            ),
        };

        // And return it all
        return output;
    };

    public resolveState = (id: string, userID: string): Promise<InternalState> => this
        .resolve(id, StateGatewayInterface.STATE_READ_KEY, userID);

    public resolveUser = (id: string, userID: string): Promise<InternalUser> => this
        .resolve(id, UserGatewayInterface.USER_READ_KEY, userID);

    public resolveVenue = async (id: string, userID: string): Promise<InternalVenue> => {
        // Load raw venue
        const shallowVenue: ShallowInternalVenue = await this.resolve(id, VenueGatewayInterface.VENUE_READ_KEY, userID);

        // Then create an output and resolve the user
        const output: InternalVenue = shallowVenue as unknown as InternalVenue; // Intentional need to convert the types
        output.user = await this.resolve<InternalUser>(shallowVenue.user, UserGatewayInterface.USER_READ_KEY, userID);

        // And return the resolved entity
        return output;
    };

    public resolveEvent = async (id: string, userID: string): Promise<InternalEvent> => {
        // Load raw event
        const shallowEvent: ShallowInternalEvent = await this.resolve(id, EVENT_DETAILS_SERVICE_TOPIC_GET, userID);

        // And return the resolved entity
        return {
            ...shallowEvent,
            ents: shallowEvent.ents === undefined ? undefined : await this.resolveEntState(shallowEvent.ents, userID),
            state: shallowEvent.state === undefined ? undefined : await this.resolveState(shallowEvent.state, userID),
            venues: await Promise.all(shallowEvent.venues.map((e) => this.resolveVenue(e, userID))),
        };
    };

    public resolveFile = async (id: string, userID: string): Promise<InternalFile> => {
        const shallowFile: ShallowInternalFile = await this.resolve(id, FileGatewayInterface.FILE_READ_KEY, userID);

        return {
            ...shallowFile,
            owner: await this.resolveUser(shallowFile.owner, userID),
        };
    };
}
