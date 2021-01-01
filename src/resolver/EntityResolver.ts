import { GatewayMk2 } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { MsgStatus } from '@uems/uemscommlib/build/messaging/types/event_response_schema';
import { VenueValidators } from '@uems/uemscommlib/build/venues/VenueValidators';
import { VenueGatewayInterface } from '../attachments/attachments/VenueGatewayInterface';
import { UserValidators } from '@uems/uemscommlib/build/user/UserValidators';
import { UserGatewayInterface } from '../attachments/attachments/UserGatewayInterface';
import { EntStateValidators } from '@uems/uemscommlib/build/ent/EntStateValidators';
import { EntStateGatewayInterface } from '../attachments/attachments/EntStateGatewayInterface';
import { EquipmentValidators } from '@uems/uemscommlib/build/equipment/EquipmentValidators';
import { EquipmentGatewayInterface } from '../attachments/attachments/EquipmentGatewayInterface';
import { StateGatewayInterface } from '../attachments/attachments/StateGatewayInterface';
import { StateValidators } from '@uems/uemscommlib/build/state/StateValidators';
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import has = MessageUtilities.has;
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import VenueRepresentation = VenueValidators.VenueRepresentation;
import UserRepresentation = UserValidators.UserRepresentation;
import EntStateRepresentation = EntStateValidators.EntStateRepresentation;
import EquipmentRepresentation = EquipmentValidators.EquipmentRepresentation;
import StateRepresentation = StateValidators.StateRepresentation;

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

    public resolveEntState = (id: string): Promise<EntStateRepresentation> => this
        .resolve(id, EntStateGatewayInterface.ENT_STATE_READ_KEY);

    public resolveEquipment = (id: string): Promise<EquipmentRepresentation> => this
        .resolve(id, EquipmentGatewayInterface.EQUIPMENT_READ_KEY);

    // TODO:?
    // public resolveEvent = (id: string): Promise<InternalEvent> => this
    //     .resolve(id, EventGatewayAttachment);

    public resolveState = (id: string): Promise<StateRepresentation> => this
        .resolve(id, StateGatewayInterface.STATE_READ_KEY);

    public resolveUser = (id: string): Promise<UserRepresentation> => this
        .resolve(id, UserGatewayInterface.USER_READ_KEY);

    public resolveVenue = (id: string): Promise<VenueRepresentation> => this
        .resolve(id, VenueGatewayInterface.VENUE_READ_KEY);

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

    public resolveEntStateSet = async (entState: { [key: string]: any, ents?: string | EntStateRepresentation }[]) => {
        await this.resolveGenericSet(
            entState, 'ents' as string, this.resolveEntState,
        );
    };

    public resolveEquipmentSet = async (
        equipmentType: { [key: string]: any, equipment?: string | EquipmentRepresentation }[],
    ) => {
        await this.resolveGenericSet(
            equipmentType, 'equipment' as string, this.resolveEquipment,
        );
    };

    public resolveStateSet = async (stateType: { [key: string]: any, state?: string | StateRepresentation }[]) => {
        await this.resolveGenericSet(
            stateType, 'state' as string, this.resolveState,
        );
    };

    public resolveUserSet = async (userType: { [key: string]: any, user?: string | UserRepresentation }[]) => {
        await this.resolveGenericSet(
            userType, 'user' as string, this.resolveUser,
        );
    };

    public resolveVenueSet = async (venueType: { [key: string]: any, venue?: string | VenueRepresentation }[]) => {
        await this.resolveGenericSet(
            venueType, 'venue' as string, this.resolveVenue,
        );
    };
}
