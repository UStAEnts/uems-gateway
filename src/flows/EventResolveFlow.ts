import { Response } from 'express';
import { EventResponse } from '@uems/uemscommlib';
import { MessageUtilities, truthy, unique } from '../utilities/MessageUtilities';
import { GatewayMk2 } from '../Gateway';
import { constants } from 'http2';
import { EventValidators } from '@uems/uemscommlib/build/event/EventValidators';
import { lookupEntsStates, lookupShallowVenues, lookupStates, lookupUsers, mapToValue } from './FlowTools';
import { resolveVenues } from './VenueResolveFlow';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import EventRepresentation = EventValidators.EventRepresentation;
import EventServiceReadResponseMessage = EventResponse.EventServiceReadResponseMessage;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import ShallowEventRepresentation = EventValidators.ShallowEventRepresentation;

export async function resolveEvents(
    gateway: GatewayMessageHandler,
    response: ShallowEventRepresentation[],
    requestID: string,
    userID: string,
): Promise<{ partial: boolean, value: EventRepresentation[] }> {
    const venueIDs = response.map((e) => e.venues)
        .flat()
        .filter(unique);
    const stateIDs = response.map((e) => e.state)
        .filter(unique)
        .filter(truthy) as string[];
    const entsIDs = response.map((e) => e.ents)
        .filter(unique)
        .filter(truthy) as string[];
    const userIDs = response.map((e) => e.author)
        .filter(unique);

    let partial = false;

    const venuesPromise = lookupShallowVenues(gateway, venueIDs, requestID, userID)
        .then((v) => resolveVenues(gateway, v, requestID, userID))
        .then((v) => {
            partial = partial || v.partial;
            return v.value;
        });
    const statePromise = lookupStates(gateway, stateIDs, requestID, userID);
    const entsPromise = lookupEntsStates(gateway, entsIDs, requestID, userID);
    const userPromise = lookupUsers(gateway, userIDs, requestID, userID);

    const [venues, state, ents, user] = await Promise.all([venuesPromise, statePromise, entsPromise, userPromise]);

    const events = response.map((e): EventRepresentation | null => {
        try {
            return {
                ...e,
                state: e.state ? state.find((v) => v.id === e.state) : undefined,
                ents: e.ents ? ents.find((v) => v.id === e.ents) : undefined,
                author: mapToValue(e.author, user),
                venues: e.venues.map((v) => mapToValue(v, venues)),
            };
        } catch (err: any) {
            if (err.message === 'not found') return null;
            throw err;
        }
    });

    const value = events.filter((e) => e !== null) as EventRepresentation[];
    partial = partial || value.length !== response.length;

    return {
        partial,
        value,
    };
}

export function resolveEventsFlow(
    gateway: GatewayMessageHandler,
) {
    return async function resolveEventsFlowInner(
        http: Response,
        timestamp: number,
        resp: MinimalMessageType,
    ): Promise<void> {
        const { requestID } = http;
        const { userID } = http.req.uemsUser;

        // TODO revalidate
        const response = resp as any as EventServiceReadResponseMessage;
        const {
            partial,
            value,
        } = await resolveEvents(gateway, response.result, requestID, userID);

        if (partial) {
            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInPartial(value));
        } else {
            http
                .status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(value));
        }
    };
}
