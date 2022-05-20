import { GatewayMk2 } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { EntStateResponse, EquipmentResponse, EventResponse, FileResponse, StateResponse, TopicResponse, UserResponse, VenueResponse } from '@uems/uemscommlib';
import { _byFile } from '../log/Log';
import { Constants } from '../utilities/Constants';
import ROUTING_KEY = Constants.ROUTING_KEY;
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
import InternalTopic = TopicResponse.InternalTopic;
import log from '@uems/micro-builder/build/src/logging/Log';
import notifyingCache, { CacheKey } from '../utilities/Cache';

const _l = _byFile(__filename);
const _ = log.auto;

const nopLogger: Record<string, Function> = {
    trace: (...a: any[]) => undefined,
    debug: (...a: any[]) => undefined,
    info: (...a: any[]) => undefined,
    error: _.system.error,
    fatal: _.system.error,
    warn: _.system.warn,
};

export class EntityResolver {
    private _handler: GatewayMessageHandler;

    constructor(handler: GatewayMk2.GatewayMessageHandler) {
        this._handler = handler;
    }


    public resolve<T>(
        id: string,
        key: string,
        userID: string,
        requestID?: string,
        cacheKey?: CacheKey,
        middleware?: (value: any) => T,
    ): Promise<T> {
        const __ = requestID ? _(requestID) : nopLogger;
        const resolveViaNetwork = () => new Promise<T>((res, rej) => {
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
                    __.warn(`got result for ${name} which was not an array so rejecting the resolution`, { result });
                    rej(new Error('Result was not an array'));
                    return;
                }

                if (result.length !== 1) {
                    __.warn(`got result for ${name} which had too many elements, got ${result.length}`);
                    __.warn('Stack trace', { stack });
                    rej(new Error(`Result had too many or too few elements, expected 1 got ${result.length}`));
                    return;
                }

                __.trace(`resolved via response for ${cacheKey}.${id} ${name}`);

                if (middleware) {
                    const intermediate = middleware(result[0]);
                    res(intermediate);

                    if (cacheKey) {
                        notifyingCache.cache(cacheKey as any, intermediate as any);
                        __.trace(`${id} inserted into cache`);
                    }
                } else {
                    res(result[0]);

                    if (cacheKey) {
                        notifyingCache.cache(cacheKey as any, result[0]);
                        __.trace(`${id} inserted into cache`);
                    }
                }
            };

            if (requestID) {
                __.trace(`publishing request for :: ${query.msg_id} of READ for ${key}`);
            }
            this._handler.interceptResponseCallback(query.msg_id, callback, rej);
            this._handler.publish(key, query, requestID);
        });
        const resolveViaCache = () => new Promise<T>((res, rej) => {
            if (!cacheKey) {
                rej();
                return;
            }

            const val = notifyingCache.get(cacheKey as any, id);
            if (val) {
                res(val as unknown as T);
                __.trace(`cache hit for ${cacheKey}.${id}`);
                return;
            }

            // Make sure this gets cleaned up?
            setTimeout(rej, 60000);
        });

        if (cacheKey) {
            return Promise.race([resolveViaCache(), resolveViaNetwork()]);
        }
        return resolveViaNetwork();
        // return new Promise<T>((resolve, reject) => {
        //     let isResolved = false;
        //     if (cacheKey && notifyingCache.has(cacheKey, id)) {
        //         if (requestID) {
        //         }
        //         // TODO: bad typing
        //         resolve(notifyingCache.get(cacheKey as any, id) as any);
        //         isResolved = true;
        //         return;
        //     }
        //
        //     if (requestID) {
        //         _(requestID)
        //             .trace(`cache miss for ${cacheKey}.${id}`);
        //     }
        //     //
        //     let cancelCacheWait: Function | undefined;
        //     if (cacheKey) {
        //         cancelCacheWait = notifyingCache.await(cacheKey, id, (v) => {
        //             if (!isResolved) {
        //                 isResolved = true;
        //                 resolve(v);
        //
        //                 if (requestID) {
        //                     _(requestID)
        //                         .trace(`resolved via cache ${cacheKey}.${id}`);
        //                 }
        //             }
        //         });
        //     }
        //
        // });
    }

    public resolveEntState = (id: string, userID: string, requestID: string): Promise<InternalEntState> => this
        .resolve(id, ROUTING_KEY.ent.read, userID, requestID, 'entState');

    public resolveEquipment = async (id: string, userID: string, requestID: string): Promise<InternalEquipment> => {
        const cached = notifyingCache.get('equipment', id);
        if (cached) return cached;
        // Load the equipment
        const shallowEquipment: ShallowInternalEquipment = await this.resolve(
            id,
            ROUTING_KEY.equipment.read,
            userID,
            requestID,
            undefined,
        );

        // Then resolve the user
        const output: InternalEquipment = {
            ...shallowEquipment,
            manager: await this.resolve<InternalUser>(
                shallowEquipment.manager,
                ROUTING_KEY.user.read,
                userID,
                requestID,
                'user',
            ),
            location: await this.resolve<InternalVenue>(
                shallowEquipment.location,
                ROUTING_KEY.venues.read,
                userID,
                requestID,
                'venue',
            ),
        };

        notifyingCache.cache('equipment', output);

        // And return it all
        return output;
    };

    public resolveState = (id: string, userID: string, requestID: string): Promise<InternalState> => this
        .resolve(id, ROUTING_KEY.states.read, userID, requestID, 'state');

    public resolveUser = (id: string, userID: string, requestID: string): Promise<InternalUser> => this
        .resolve(id, ROUTING_KEY.user.read, userID, requestID, 'user');

    public resolveTopic = (id: string, userID: string, requestID: string): Promise<InternalTopic> => this
        .resolve(id, ROUTING_KEY.topic.read, userID, requestID, 'topic');

    public resolveVenue = async (id: string, userID: string, requestID: string): Promise<InternalVenue> => {
        const cached = notifyingCache.get('venue', id);
        if (cached) return cached;
        // Load raw venue
        const shallowVenue: ShallowInternalVenue = await this
            .resolve(id, ROUTING_KEY.venues.read, userID, requestID);

        // Then create an output and resolve the user
        const output: InternalVenue = shallowVenue as unknown as InternalVenue; // Intentional need to convert the types
        output.user = await this.resolve<InternalUser>(
            shallowVenue.user,
            ROUTING_KEY.user.read,
            userID,
            requestID,
            'user',
        );

        notifyingCache.cache('venue', output);

        // And return the resolved entity
        return output;
    };

    public resolveEvent = async (id: string, userID: string, requestID: string): Promise<InternalEvent> => {
        const cached = notifyingCache.get('event', id);
        if (cached) return cached;
        // Load raw event
        const shallowEvent: ShallowInternalEvent = await this.resolve(
            id,
            ROUTING_KEY.event.read,
            userID,
            requestID,
        );

        // And return the resolved entity
        const output = {
            ...shallowEvent,
            ents: shallowEvent.ents === undefined ? undefined : await this.resolveEntState(
                shallowEvent.ents,
                userID,
                requestID,
            ),
            state: shallowEvent.state === undefined ? undefined : await this.resolveState(
                shallowEvent.state,
                userID,
                requestID,
            ),
            author: await this.resolveUser(shallowEvent.author, userID, requestID),
            venues: await Promise.all(shallowEvent.venues.map((e) => this.resolveVenue(e, userID, requestID))),
        };

        notifyingCache.cache('event', output);

        return output;
    };

    public resolveFile = async (id: string, userID: string, requestID: string): Promise<InternalFile> => {
        const cached = notifyingCache.get('file', id);
        if (cached) return cached;

        const shallowFile: ShallowInternalFile = await this.resolve(
            id,
            ROUTING_KEY.file.read,
            userID,
            requestID,
        );

        const output = {
            ...shallowFile,
            owner: await this.resolveUser(shallowFile.owner, userID, requestID),
        };

        notifyingCache.cache('file', output);

        return output;
    };
}
