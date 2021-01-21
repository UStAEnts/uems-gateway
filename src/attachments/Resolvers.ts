import { CommentResponse, EquipmentResponse, EventResponse, FileBindingResponse, FileResponse, SignupResponse, VenueResponse } from "@uems/uemscommlib";
import { GenericHandlerFunctions } from "./GenericHandlerFunctions";
import { EntityResolver } from "../resolver/EntityResolver";
import SingleTransformer = GenericHandlerFunctions.SingleTransformer;
import Transformer = GenericHandlerFunctions.Transformer;
import { FileBindingValidators } from "@uems/uemscommlib/build/filebinding/FileBindingValidators";
import { ifError } from "assert";
import { __ } from "../log/Log";

function singleToDouble<S, D, R extends { result: S[] }>(x: SingleTransformer<S, D, R>): Transformer<S, D, R> {
    // TODO: log errors and maybe provide some indication of partial responses. Do this in a later feature phase

    return (async (data) => {
        const promises = data.map((e) => x(e));
        const resolution = await Promise.allSettled(promises);
        const fulfilled = resolution.filter((e) => e.status === 'fulfilled') as { value: D }[];
        if (fulfilled.length !== resolution.length) {
            __.warn('Some resolutions failed when settling');
            resolution.forEach((e) => {
                if (e.status === 'rejected') console.warn(e.reason);
            });
        }

        const results = fulfilled.map((e) => e.value);
        return results;
    });
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
    import ShallowQueryByFileResponse = FileBindingResponse.ShallowQueryByFileResponse;
    import FileBindingResponseSchema = FileBindingValidators.FileBindingResponseSchema;
    import QueryByFileResponse = FileBindingResponse.QueryByFileResponse;
    import ShallowQueryByEventResponse = FileBindingResponse.ShallowQueryByEventResponse;

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

    type EventsFileBindingTransformer =
        Transformer<string, InternalEvent, ShallowQueryByFileResponse>;

    type FilesFileBindingTransformer =
        Transformer<string, InternalFile, ShallowQueryByEventResponse>;

    export function resolveSingleEvent(resolver: EntityResolver | undefined, userID: string): EventTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver is not defined');

            console.log(data);

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

    export function resolveSingleSignup(
        resolver: EntityResolver | undefined,
        userID: string,
        includeEvent: boolean,
    ): SignupTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return {
                ...data,
                user: await resolver.resolveUser(data.user, userID),
                event: includeEvent
                    ? await resolver.resolveEvent(data.event, userID)
                    : undefined as unknown as InternalEvent,
            };
        };
    }

    export function resolveSignups(
        resolver: EntityResolver | undefined,
        userID: string,
        includeEvent: boolean,
    ): MultiSignupTransformer {
        return singleToDouble(resolveSingleSignup(resolver, userID, includeEvent));
    }

    export function resolveEventsForFileBinding(
        resolver: EntityResolver | undefined,
        userID: string,
    ): EventsFileBindingTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return Promise.all(data.map((e) => resolver.resolveEvent(e, userID)));
        };
    }

    export function resolveFilesForFileBinding(
        resolver: EntityResolver | undefined,
        userID: string,
    ): FilesFileBindingTransformer {
        return async (data) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            return Promise.all(data.map((e) => resolver.resolveFile(e, userID)));
        };
    }

}
