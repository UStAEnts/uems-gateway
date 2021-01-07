import { GatewayMk2 } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { VenueGatewayInterface } from '../attachments/attachments/VenueGatewayInterface';
import { UserGatewayInterface } from '../attachments/attachments/UserGatewayInterface';
import { EntStateGatewayInterface } from '../attachments/attachments/EntStateGatewayInterface';
import { EquipmentGatewayInterface } from '../attachments/attachments/EquipmentGatewayInterface';
import { StateGatewayInterface } from '../attachments/attachments/StateGatewayInterface';
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import has = MessageUtilities.has;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { EntStateResponse, EquipmentResponse, MsgStatus, StateResponse, UserResponse, VenueResponse } from '@uems/uemscommlib';
import InternalEntState = EntStateResponse.InternalEntState;
import InternalEquipment = EquipmentResponse.InternalEquipment;
import InternalState = StateResponse.InternalState;
import InternalUser = UserResponse.InternalUser;
import InternalVenue = VenueResponse.InternalVenue;
import ShallowInternalEquipment = EquipmentResponse.ShallowInternalEquipment;
import ShallowInternalVenue = VenueResponse.ShallowInternalVenue;

export class EntityResolver {
    private _pendingMessageIDs: {
        [key: number]: {
            callback: (entity: any | null) => void,
            reject: (entity: any | null) => void,
            submitted: number,
        }
    } = {};

    private _handler: GatewayMessageHandler;

    constructor(handler: GatewayMk2.GatewayMessageHandler) {
        this._handler = handler;
    }

    public intercept(id: number): boolean {
        // console.log('do we need to intercept ', id, has(this._pendingMessageIDs, id));
        return has(this._pendingMessageIDs, id);
    }

    public consume(message: MinimalMessageType) {
        const entry = this._pendingMessageIDs[message.msg_id];
        // console.log('trying to consume', message, 'with entry', entry);
        if (!entry) return;

        if (message.status === MsgStatus.FAIL) {
            entry.reject(message);
            return;
        }

        if (!has(message, 'result')) {
            entry.reject(message);
            return;
        }

        // console.log('performing callback');
        entry.callback(message.result);
    }

    private resolve<T>(id: string, key: string, middleware?: (value: any) => T): Promise<T> {
        console.log('trying to resolve', id, 'with key', key);
        return new Promise<T>((resolve, reject) => {
            const query = {
                msg_id: MessageUtilities.generateMessageIdentifier(),
                msg_intention: 'READ',
                status: 0,
                id,
            };

            const callback = (result: any): any => {
                if (!Array.isArray(result)) {
                    reject(new Error('Result was not an array'));
                    return;
                }

                if (result.length !== 1) {
                    reject(new Error(`Result had too many or too few elements, expected 1 got ${result.length}`));
                    return;
                }

                if (middleware) {
                    resolve(middleware(result[0]));
                } else {
                    resolve(result[0]);
                }
            };

            this._pendingMessageIDs[query.msg_id] = {
                reject,
                callback,
                submitted: Date.now(),
            };

            // console.log('added to pending');

            this._handler.publish(key, query);
            // console.log('published');
        });
    }

    public resolveEntState = (id: string): Promise<InternalEntState> => this
        .resolve(id, EntStateGatewayInterface.ENT_STATE_READ_KEY);

    public resolveEquipment = async (id: string): Promise<InternalEquipment> => {
        // Load the equipment
        const shallowEquipment: ShallowInternalEquipment = await this.resolve(
            id,
            EquipmentGatewayInterface.EQUIPMENT_READ_KEY,
        );

        // Then resolve the user
        const output: InternalEquipment = {
            ...shallowEquipment,
            manager: await this.resolve<InternalUser>(shallowEquipment.manager, UserGatewayInterface.USER_READ_KEY),
            location: await this.resolve<InternalVenue>(
                shallowEquipment.location,
                VenueGatewayInterface.VENUE_READ_KEY,
            ),
        };

        // And return it all
        return output;
    };

    // TODO:?
    // public resolveEvent = (id: string): Promise<InternalEvent> => this
    //     .resolve(id, EventGatewayAttachment);

    public resolveState = (id: string): Promise<InternalState> => this
        .resolve(id, StateGatewayInterface.STATE_READ_KEY);

    public resolveUser = (id: string): Promise<InternalUser> => this
        .resolve(id, UserGatewayInterface.USER_READ_KEY);

    public resolveVenue = async (id: string): Promise<InternalVenue> => {
        // Load raw venue
        const shallowVenue: ShallowInternalVenue = await this.resolve(id, VenueGatewayInterface.VENUE_READ_KEY);

        // Then create an output and resolve the user
        const output: InternalVenue = shallowVenue as unknown as InternalVenue; // Intentional need to convert the types
        output.user = await this.resolve<InternalUser>(shallowVenue.user, UserGatewayInterface.USER_READ_KEY);

        // And return the resolved entity
        return output;
    };

    private resolveGenericSet = async <X, T extends X[], V extends { id: string }>(
        type: T,
        key: keyof X | string,
        resolver: (id: string) => V | Promise<V>,
    ): Promise<void> => {
        // @ts-ignore - not ideal, to support optional keys, ones that don't show up in keyof X we need to support
        // string but then generic access doesn't work. We do filter for undefined so it should be fine but we'll see
        // TODO: is there a better way?
        const ids = type.map((entry) => entry[key] as unknown as string)
            .filter((entry) => entry !== null && entry !== undefined) as string[];

        const entities = await Promise.all(ids.map((id) => Promise.resolve(resolver(id))));

        entities.forEach((entry) => {
            if (entry === undefined) return;

            // @ts-ignore
            const matched = type.find((element) => element[key] === entry.id);
            if (matched === undefined) return;

            // @ts-ignore
            matched[key] = entry;
        });
    };

}
