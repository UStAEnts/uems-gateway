import { CommentResponse, EquipmentResponse, EventResponse, FileResponse, SignupResponse, VenueResponse } from "@uems/uemscommlib";
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
    import ShallowInternalFile = FileResponse.ShallowInternalFile;
    import InternalFile = FileResponse.InternalFile;
    import FileServiceReadResponseMessage = FileResponse.FileServiceReadResponseMessage;
    import InternalSignup = SignupResponse.InternalSignup;
    import SignupServiceReadResponseMessage = SignupResponse.SignupServiceReadResponseMessage;
    import ShallowInternalSignup = SignupResponse.ShallowInternalSignup;

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

    type MultiFileTransformer =
        Transformer<ShallowInternalFile, InternalFile, FileServiceReadResponseMessage>;

    type FileTransformer =
        SingleTransformer<ShallowInternalFile, InternalFile, FileServiceReadResponseMessage>;

    type MultiSignupTransformer =
        Transformer<ShallowInternalSignup, InternalSignup, SignupServiceReadResponseMessage>;

    type SignupTransformer =
        SingleTransformer<ShallowInternalSignup, InternalSignup, SignupServiceReadResponseMessage>;

    export function resolveSingleEvent(resolver: EntityResolver | undefined): EventTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver is not defined');

            return {
                ...data,
                state: data.state === undefined ? undefined : await resolver.resolveState(data.state, userID),
                ents: data.ents === undefined ? undefined : await resolver.resolveEntState(data.ents, userID),
                venues: await Promise.all(data.venues.map((e) => resolver.resolveVenue(e, userID))),
            };
        };
    }

    export function resolveEvents(resolver: EntityResolver | undefined, userID: string): MultiEventTransformer {
        return singleToDouble(resolveSingleEvent(resolver, userID));
    }

    export function resolveSingleComment(resolver: EntityResolver | undefined, userID: string): CommentTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                attendedBy: data.attendedBy === undefined ? undefined : await resolver.resolveUser(
                    data.attendedBy,
                    userID,
                ),
                poster: await resolver.resolveUser(data.poster, userID),
            };
        };
    }

    export function resolveComments(resolver: EntityResolver | undefined, userID: string): MultiCommentTransformer {
        return singleToDouble(resolveSingleComment(resolver, userID));
    }

    export function resolveSingleVenue(resolver: EntityResolver | undefined, userID: string): VenueTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                user: await resolver.resolveUser(data.user, userID),
            };
        };
    }

    export function resolveVenues(resolver: EntityResolver | undefined, userID: string): MultiVenueTransformer {
        return singleToDouble(resolveSingleVenue(resolver, userID));
    }

    export function resolveSingleEquipment(resolver: EntityResolver | undefined, userID: string): EquipmentTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                location: await resolver.resolveVenue(data.location, userID),
                manager: await resolver.resolveUser(data.manager, userID),
            };
        };
    }

    export function resolveEquipments(resolver: EntityResolver | undefined, userID: string): MultiEquipmentTransformer {
        return singleToDouble(resolveSingleEquipment(resolver, userID));
    }

    export function resolveSingleFile(resolver: EntityResolver | undefined, userID: string): FileTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                owner: await resolver.resolveUser(data.owner, userID),
            };
        };
    }

    export function resolveFiles(resolver: EntityResolver | undefined, userID: string): MultiFileTransformer {
        return singleToDouble(resolveSingleFile(resolver, userID));
    }

    export function resolveSingleSignup(resolver: EntityResolver | undefined): SignupTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                user: await resolver.resolveUser(data.user),
                event: await resolver.resolveEvent(data.event),
            };
        };
    }

    export function resolveSignups(resolver: EntityResolver | undefined): MultiSignupTransformer {
        return singleToDouble(resolveSingleSignup(resolver));
    }

}
