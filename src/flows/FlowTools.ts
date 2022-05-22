import { MessageUtilities } from '../utilities/MessageUtilities';
import { UserValidators } from '@uems/uemscommlib/build/user/UserValidators';
import { GatewayMk2 } from '../Gateway';
import { Constants } from '../utilities/Constants';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import ROUTING_KEY = Constants.ROUTING_KEY;
import UserRepresentation = UserValidators.UserRepresentation;
import { StateValidators } from '@uems/uemscommlib/build/state/StateValidators';
import StateRepresentation = StateValidators.StateRepresentation;
import { EntStateValidators } from '@uems/uemscommlib/build/ent/EntStateValidators';
import EntStateRepresentation = EntStateValidators.EntStateRepresentation;
import { VenueValidators } from '@uems/uemscommlib/build/venues/VenueValidators';
import ShallowVenueRepresentation = VenueValidators.ShallowVenueRepresentation;

export const mapToValue = <T extends { id: string }>(id: string, options: T[]) => {
    const result = options.find((e) => e.id === id);
    if (result === undefined) {
        throw new Error('not found');
    }
    return result;
};

export function lookup<T>(
    gateway: GatewayMessageHandler,
    ids: string[],
    requestID: string,
    routingKey: string,
    userID: string,
) {
    return new Promise<T[]>((resolve, reject) => {
        const message = {
            msg_id: MessageUtilities.generateMessageIdentifier(),
            status: 0,
            msg_intention: 'READ',
            userID,
            id: ids,
        };

        gateway.buildSend(routingKey, message)
            .name(`${routingKey}.resolve.${ids.length}.${Date.now()}`)
            .timeout(10000)
            .fail(reject)
            .reply((value) => resolve(value))
            .submit(requestID);
    });
}

export function lookupUsers(
    gateway: GatewayMessageHandler,
    ids: string[],
    requestID: string,
    userID: string,
): Promise<UserRepresentation[]> {
    return lookup<UserRepresentation>(
        gateway,
        ids,
        requestID,
        ROUTING_KEY.user.read,
        userID,
    );
}

export function lookupStates(
    gateway: GatewayMessageHandler,
    ids: string[],
    requestID: string,
    userID: string,
): Promise<StateRepresentation[]> {
    return lookup<StateRepresentation>(
        gateway,
        ids,
        requestID,
        ROUTING_KEY.states.read,
        userID,
    );
}

export function lookupEntsStates(
    gateway: GatewayMessageHandler,
    ids: string[],
    requestID: string,
    userID: string,
): Promise<EntStateRepresentation[]> {
    return lookup<EntStateRepresentation>(
        gateway,
        ids,
        requestID,
        ROUTING_KEY.ent.read,
        userID,
    );
}

export function lookupShallowVenues(
    gateway: GatewayMessageHandler,
    ids: string[],
    requestID: string,
    userID: string,
): Promise<ShallowVenueRepresentation[]> {
    return lookup<ShallowVenueRepresentation>(
        gateway,
        ids,
        requestID,
        ROUTING_KEY.venues.read,
        userID,
    );
}
