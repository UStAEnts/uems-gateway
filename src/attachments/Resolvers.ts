import { CommentResponse, EquipmentResponse, EventResponse, VenueResponse } from "@uems/uemscommlib";
import { GenericHandlerFunctions } from "./GenericHandlerFunctions";
import { EntityResolver } from "../resolver/EntityResolver";
import SingleTransformer = GenericHandlerFunctions.SingleTransformer;
import Transformer = GenericHandlerFunctions.Transformer;

function singleToDouble<S, D, R extends { result: S[] }>(x: SingleTransformer<S, D, R>): Transformer<S, D, R> {
    return async (data) => Promise.all(data.map((e) => x(e)));
}

export namespace Resolver {

    import CommentServiceReadResponseMessage = CommentResponse.CommentServiceReadResponseMessage;
    import ShallowInternalComment = CommentResponse.ShallowInternalComment;
    import InternalComment = CommentResponse.InternalComment;
    import InternalEvent = EventResponse.InternalEvent;
    import ShallowInternalEvent = EventResponse.ShallowInternalEvent;
    import EventServiceReadResponseMessage = EventResponse.EventServiceReadResponseMessage;
    import ShallowInternalVenue = VenueResponse.ShallowInternalVenue;
    import VenueServiceReadResponseMessage = VenueResponse.VenueServiceReadResponseMessage;
    import InternalEquipment = EquipmentResponse.InternalEquipment;
    import InternalVenue = VenueResponse.InternalVenue;
    import ShallowInternalEquipment = EquipmentResponse.ShallowInternalEquipment;
    import EquipmentServiceReadResponseMessage = EquipmentResponse.EquipmentServiceReadResponseMessage;

    type MultiEventTransformer =
        Transformer<ShallowInternalEvent, InternalEvent, EventServiceReadResponseMessage>;

    type EventTransformer =
        SingleTransformer<ShallowInternalEvent, InternalEvent, EventServiceReadResponseMessage>;

    type MultiCommentTransformer =
        Transformer<ShallowInternalComment, InternalComment, CommentServiceReadResponseMessage>;

    type CommentTransformer =
        SingleTransformer<ShallowInternalComment, InternalComment, CommentServiceReadResponseMessage>;

    type MultiVenueTransformer =
        Transformer<ShallowInternalVenue, InternalVenue, VenueServiceReadResponseMessage>;

    type VenueTransformer =
        SingleTransformer<ShallowInternalVenue, InternalVenue, VenueServiceReadResponseMessage>;

    type MultiEquipmentTransformer =
        Transformer<ShallowInternalEquipment, InternalEquipment, EquipmentServiceReadResponseMessage>;

    type EquipmentTransformer =
        SingleTransformer<ShallowInternalEquipment, InternalEquipment, EquipmentServiceReadResponseMessage>;

    export function resolveSingleEvent(resolver: EntityResolver | undefined): EventTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver is not defined');

            return {
                ...data,
                state: data.state === undefined ? undefined : await resolver.resolveState(data.state),
                ents: data.ents === undefined ? undefined : await resolver.resolveEntState(data.ents),
                venues: await Promise.all(data.venues.map((e) => resolver.resolveVenue(e))),
            };
        };
    }

    export function resolveEvents(resolver: EntityResolver | undefined): MultiEventTransformer {
        return singleToDouble(resolveSingleEvent(resolver));
    }

    export function resolveSingleComment(resolver: EntityResolver | undefined): CommentTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                attendedBy: data.attendedBy === undefined ? undefined : await resolver.resolveUser(data.attendedBy),
                poster: await resolver.resolveUser(data.poster),
            };
        };
    }

    export function resolveComments(resolver: EntityResolver | undefined): MultiCommentTransformer {
        return singleToDouble(resolveSingleComment(resolver));
    }

    export function resolveSingleVenue(resolver: EntityResolver | undefined): VenueTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                user: await resolver.resolveUser(data.user),
            };
        };
    }

    export function resolveVenues(resolver: EntityResolver | undefined): MultiVenueTransformer {
        return singleToDouble(resolveSingleVenue(resolver));
    }

    export function resolveSingleEquipment(resolver: EntityResolver | undefined): EquipmentTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                location: await resolver.resolveVenue(data.location),
                manager: await resolver.resolveUser(data.manager),
            };
        };
    }

    export function resolveEquipments(resolver: EntityResolver | undefined): MultiEquipmentTransformer {
        return singleToDouble(resolveSingleEquipment(resolver));
    }

}
