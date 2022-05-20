/* eslint-disable indent */
import { EntStateResponse, EquipmentResponse, EventResponse, FileResponse, StateResponse, TopicResponse, UserResponse, VenueResponse } from "@uems/uemscommlib";
import InternalEntState = EntStateResponse.InternalEntState;
import InternalEquipment = EquipmentResponse.InternalEquipment;
import InternalState = StateResponse.InternalState;
import InternalUser = UserResponse.InternalUser;
import InternalTopic = TopicResponse.InternalTopic;
import InternalVenue = VenueResponse.InternalVenue;
import InternalEvent = EventResponse.InternalEvent;
import InternalFile = FileResponse.InternalFile;

type CacheElement<T> = { value: T, inserted: number };

export type CacheKey = 'entState' | 'equipment' | 'state' | 'user' | 'topic' | 'venue' | 'event' | 'file';

class NotifyingCache {

    private maxCacheTime: number = 3000;
    private readonly entState: Record<string, CacheElement<InternalEntState>> = {};
    private readonly equipment: Record<string, CacheElement<InternalEquipment>> = {};
    private readonly state: Record<string, CacheElement<InternalState>> = {};
    private readonly user: Record<string, CacheElement<InternalUser>> = {};
    private readonly topic: Record<string, CacheElement<InternalTopic>> = {};
    private readonly venue: Record<string, CacheElement<InternalVenue>> = {};
    private readonly event: Record<string, CacheElement<InternalEvent>> = {};
    private readonly file: Record<string, CacheElement<InternalFile>> = {};
    private readonly waiting: Record<string, CacheElement<(v: any) => void>[]> = {};
    private readonly _inFlight: Map<string, number> = new Map<string, number>();

    // TODO: schedule
    cleanup() {
        const now = Date.now();
        const tryDelete = (id: string, container: Record<string, CacheElement<any>>) => {
            // eslint-disable-next-line no-param-reassign
            if (now - container[id].inserted >= this.maxCacheTime) delete container[id];
        };

        const all = [this.entState, this.equipment, this.state, this.user, this.topic, this.venue,
            this.event, this.file];

        all.forEach((c) => Object.keys(c)
            .forEach((e) => tryDelete(e, c)));

        Object.keys(this.waiting)
            .forEach((e) => {
                this.waiting[e] = this.waiting[e].filter((f) => now - f.inserted >= this.maxCacheTime);
            });
    }

    private notify(key: string, value: any) {
        if (this.waiting[key]) {
            this.waiting[key].forEach((e) => e.value(value));
            delete this.waiting[key];
        }
    }

    // TODO: individual functions defs
    await(
        category: CacheKey,
        id: string,
        handle: (v: any) => void,
    ): (() => void) {
        const key = `${category}.${id}`;
        const entity = {
            value: handle,
            inserted: Date.now(),
        };

        if (this.waiting[key]) {
            this.waiting[key].push(entity);
        } else {
            this.waiting[key] = [entity];
        }

        return () => {
            if (this.waiting[key]) {
                this.waiting[key] = this.waiting[key].filter((e) => e !== entity);
            }
        };
    }

    has(category: CacheKey, id: string) {
        // @ts-ignore - TODO: the type system apparently can't figure this one out???
        return this.get(category, id) !== undefined;
    }

    public inFlight(category: CacheKey, id: string): void {
        this._inFlight.set(`${category}.${id}`, Date.now());
    }

    public outFlight(category: CacheKey, id: string): void {
        this._inFlight.delete(`${category}.${id}`);
    }

    public isInFlight(category: CacheKey, id: string): boolean {
        const val = this._inFlight.get(`${category}.${id}`);
        if (val === undefined) return false;
        if (Date.now() - val >= this.maxCacheTime) {
            this._inFlight.delete(`${category}.${id}`);
            return false;
        }
        return true;
    }

    public get(category: 'entState', id: string): InternalEntState;
    public get(category: 'equipment', id: string): InternalEquipment;
    public get(category: 'state', id: string): InternalState;
    public get(category: 'user', id: string): InternalUser;
    public get(category: 'topic', id: string): InternalTopic;
    public get(category: 'venue', id: string): InternalVenue;
    public get(category: 'file', id: string): InternalFile;
    public get(category: 'event', id: string): InternalEvent;
    public get(category: CacheKey, id: string) {
        const now = Date.now();
        switch (category) {
            case 'entState':
                if (this.entState[id] && now - this.entState[id].inserted >= this.maxCacheTime) {
                    delete this.entState[id];
                }

                return this.entState[id]?.value;
            case 'equipment':
                if (this.equipment[id] && now - this.equipment[id].inserted >= this.maxCacheTime) {
                    delete this.equipment[id];
                }

                return this.equipment[id]?.value;
            case 'state':
                if (this.state[id] && now - this.state[id].inserted >= this.maxCacheTime) delete this.state[id];
                return this.state[id]?.value;
            case 'user':
                if (this.user[id] && now - this.user[id].inserted >= this.maxCacheTime) delete this.user[id];
                return this.user[id]?.value;
            case 'topic':
                if (this.topic[id] && now - this.topic[id].inserted >= this.maxCacheTime) delete this.topic[id];
                return this.topic[id]?.value;
            case 'venue':
                if (this.venue[id] && now - this.venue[id].inserted >= this.maxCacheTime) delete this.venue[id];
                return this.venue[id]?.value;
            case 'event':
                if (this.event[id] && now - this.event[id].inserted >= this.maxCacheTime) delete this.event[id];
                return this.event[id]?.value;
            case 'file':
                if (this.file[id] && now - this.file[id].inserted >= this.maxCacheTime) delete this.file[id];
                return this.file[id]?.value;
            default:
                throw new Error('did you fuck up the types - I think you did');
        }
    }

    // TODO: individual functions defs
    public cache(category: 'entState', value: InternalEntState): void;
    public cache(category: 'equipment', value: InternalEquipment): void;
    public cache(category: 'state', value: InternalState): void;
    public cache(category: 'user', value: InternalUser): void;
    public cache(category: 'topic', value: InternalTopic): void;
    public cache(category: 'venue', value: InternalVenue): void;
    public cache(category: 'file', value: InternalFile): void;
    public cache(category: 'event', value: InternalEvent): void;
    cache(
        category: CacheKey,
        value: InternalEntState | InternalEquipment | InternalState | InternalUser | InternalTopic |
            InternalVenue | InternalEvent | InternalFile,
    ) {
        const identifier = `${category}.${value.id}`;
        if (this._inFlight.has(identifier)) this._inFlight.delete(identifier);
        this.notify(identifier, value);

        switch (category) {
            case 'entState':
                this.entState[value.id] = {
                    value: value as InternalEntState,
                    inserted: Date.now(),
                };
                break;
            case 'equipment':
                this.equipment[value.id] = {
                    value: value as InternalEquipment,
                    inserted: Date.now(),
                };
                break;
            case 'state':
                this.state[value.id] = {
                    value: value as InternalState,
                    inserted: Date.now(),
                };
                break;
            case 'user':
                this.user[value.id] = {
                    value: value as InternalUser,
                    inserted: Date.now(),
                };
                break;
            case 'topic':
                this.topic[value.id] = {
                    value: value as InternalTopic,
                    inserted: Date.now(),
                };
                break;
            case 'venue':
                this.venue[value.id] = {
                    value: value as InternalVenue,
                    inserted: Date.now(),
                };
                break;
            case 'event':
                this.event[value.id] = {
                    value: value as InternalEvent,
                    inserted: Date.now(),
                };
                break;
            case 'file':
                this.file[value.id] = {
                    value: value as InternalFile,
                    inserted: Date.now(),
                };
                break;
            default:
                throw new Error('did you fuck up the types - I think you did');
        }
    }

}

const notifyingCache = new NotifyingCache();
export default notifyingCache;
