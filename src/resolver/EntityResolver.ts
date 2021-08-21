import { GatewayMk2 } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { EntStateResponse, EquipmentResponse, EventResponse, FileResponse, MsgStatus, StateResponse, UserResponse, VenueResponse } from '@uems/uemscommlib';
import { _byFile } from "../log/Log";
import { Constants } from "../utilities/Constants";
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import has = MessageUtilities.has;
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
import ROUTING_KEY = Constants.ROUTING_KEY;

const _l = _byFile(__filename);

export class EntityResolver {
    private _timeout: NodeJS.Timeout;
    private _pendingMessageIDs: {
        [key: number]: {
            callback: (entity: any | null) => void,
            reject: (entity: any | null) => void,
            submitted: number,
            name: string,
            stack: Error,
        }
    } = {};

    private _handler: GatewayMessageHandler;

    constructor(handler: GatewayMk2.GatewayMessageHandler) {
        this._handler = handler;
        this._timeout = setInterval(this.terminate, 10000);
    }

    public stop() {
        clearInterval(this._timeout);
    }

    private terminate = () => {
        const now = Date.now();
        for (const entry of Object.keys(this._pendingMessageIDs) as unknown as number[]) {
            if (now - this._pendingMessageIDs[entry].submitted > 10000) {
                _l.warn(`failed to resolve ${this._pendingMessageIDs[entry].name} after 10 seconds, rejecting`);
                this._pendingMessageIDs[entry].reject(new Error('timed out'));
                delete this._pendingMessageIDs[entry];
            }
        }
    };

    public intercept(id: number): boolean {
        return has(this._pendingMessageIDs, id);
    }

    public consume(message: MinimalMessageType) {
        const entry = this._pendingMessageIDs[message.msg_id];
        if (!entry) return;

        delete this._pendingMessageIDs[message.msg_id];

        if (message.status !== MsgStatus.SUCCESS) {
            _l.warn(`failed to resolve ${entry.name} because message status ${message.status}`);
            entry.reject(message);
            return;
        }

        if (!has(message, 'result')) {
            _l.warn(`failed to resolve ${entry.name} because there was no result`, { message });
            entry.reject(message);
            return;
        }

        entry.callback(message.result);
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

            this._pendingMessageIDs[query.msg_id] = {
                reject,
                callback,
                submitted: Date.now(),
                name,
                stack,
            };

            _l.debug(`publishing request for :: ${query.msg_id} of READ for ${key}`);

            this._handler.publish(key, query);
        });
    }

    public resolveEntState = (id: string, userID: string): Promise<InternalEntState> => this
        .resolve(id, ROUTING_KEY.ent.read, userID);

    public resolveEquipment = async (id: string, userID: string): Promise<InternalEquipment> => {
        // Load the equipment
        const shallowEquipment: ShallowInternalEquipment = await this.resolve(
            id,
            ROUTING_KEY.equipment.read,
            userID,
        );

        // Then resolve the user
        const output: InternalEquipment = {
            ...shallowEquipment,
            manager: await this.resolve<InternalUser>(
                shallowEquipment.manager,
                ROUTING_KEY.user.read,
                userID,
            ),
            location: await this.resolve<InternalVenue>(
                shallowEquipment.location,
                ROUTING_KEY.venues.read,
                userID,
            ),
        };

        // And return it all
        return output;
    };

    public resolveState = (id: string, userID: string): Promise<InternalState> => this
        .resolve(id, ROUTING_KEY.states.read, userID);

    public resolveUser = (id: string, userID: string): Promise<InternalUser> => this
        .resolve(id, ROUTING_KEY.user.read, userID);

    public resolveVenue = async (id: string, userID: string): Promise<InternalVenue> => {
        // Load raw venue
        const shallowVenue: ShallowInternalVenue = await this.resolve(id, ROUTING_KEY.venues.read, userID);

        // Then create an output and resolve the user
        const output: InternalVenue = shallowVenue as unknown as InternalVenue; // Intentional need to convert the types
        output.user = await this.resolve<InternalUser>(shallowVenue.user, ROUTING_KEY.user.read, userID);

        // And return the resolved entity
        return output;
    };

    public resolveEvent = async (id: string, userID: string): Promise<InternalEvent> => {
        // Load raw event
        const shallowEvent: ShallowInternalEvent = await this.resolve(id, ROUTING_KEY.event.read, userID);

        // And return the resolved entity
        return {
            ...shallowEvent,
            ents: shallowEvent.ents === undefined ? undefined : await this.resolveEntState(shallowEvent.ents, userID),
            state: shallowEvent.state === undefined ? undefined : await this.resolveState(shallowEvent.state, userID),
            venues: await Promise.all(shallowEvent.venues.map((e) => this.resolveVenue(e, userID))),
        };
    };

    public resolveFile = async (id: string, userID: string): Promise<InternalFile> => {
        const shallowFile: ShallowInternalFile = await this.resolve(id, ROUTING_KEY.file.read, userID);

        return {
            ...shallowFile,
            owner: await this.resolveUser(shallowFile.owner, userID),
        };
    };

}
