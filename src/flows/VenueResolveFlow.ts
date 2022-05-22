import { GatewayMk2 } from '../Gateway';
import { Response } from 'express';
import { VenueResponse } from '@uems/uemscommlib';
import { lookupUsers, mapToValue } from './FlowTools';
import { constants } from 'http2';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { VenueValidators } from '@uems/uemscommlib/build/venues/VenueValidators';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import VenueServiceReadResponseMessage = VenueResponse.VenueServiceReadResponseMessage;
import MinimalMessageType = GatewayMk2.MinimalMessageType;
import VenueRepresentation = VenueValidators.VenueRepresentation;
import ShallowVenueRepresentation = VenueValidators.ShallowVenueRepresentation;

export async function resolveVenues(
    gateway: GatewayMessageHandler,
    response: ShallowVenueRepresentation[],
    requestID: string,
    userID: string,
): Promise<{ partial: boolean, value: VenueRepresentation[] }> {
    const userIDs = response.map((e) => e.user);
    const users = await lookupUsers(gateway, userIDs, requestID, userID);

    const venues = response.map((e) => {
        try {
            return {
                ...e,
                user: mapToValue(e.user, users),
            };
        } catch (err: any) {
            if (err.message === 'not found') return null;
            throw err;
        }
    });

    const reply = venues.filter((e) => e !== null) as VenueRepresentation[];
    const partial = reply.length !== response.length;

    return {
        partial,
        value: reply,
    };
}

export function resolveVenuesFlow(
    gateway: GatewayMessageHandler,
) {
    return async function resolveVenueFlowInner(
        http: Response,
        timestamp: number,
        resp: MinimalMessageType,
    ): Promise<void> {
        const response = resp as any as VenueServiceReadResponseMessage;

        const {
            partial,
            value,
        } = await resolveVenues(
            gateway,
            response.result,
            http.requestID,
            http.req?.uemsUser?.userID ?? 'anonymous',
        );

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
