import { CommentResponse, EquipmentResponse, EventResponse, FileBindingResponse, FileResponse, SignupResponse, VenueResponse } from '@uems/uemscommlib';
import { GenericHandlerFunctions } from './GenericHandlerFunctions';
import { EntityResolver } from '../resolver/EntityResolver';
import { __ } from '../log/Log';
import SingleTransformer = GenericHandlerFunctions.SingleTransformer;
import Transformer = GenericHandlerFunctions.Transformer;
import { logInfo } from "../log/RequestLogger";
import { EventValidators } from "@uems/uemscommlib/build/event/EventValidators";
import { FileValidators } from "@uems/uemscommlib/build/file/FileValidators";
import { inspect } from "util";

function singleToDouble<S, D, R extends { result: S[] }>(x: SingleTransformer<S, D, R>): Transformer<S, D, R> {
    // TODO: log errors and maybe provide some indication of partial responses. Do this in a later feature phase

    return (async (data, requestID) => {
        const promises = data.map((e) => x(e, requestID));
        const resolution = await Promise.allSettled(promises);

        const rejected = resolution.filter((e) => e.status === 'rejected') as PromiseRejectedResult[];
        const fulfilled = resolution.filter((e) => e.status === 'fulfilled') as PromiseFulfilledResult<D>[];

        if (rejected.length > 0) {
            logInfo(requestID, `When executing resolver, some results rejected on settle (${rejected.length} rejected)`);

            rejected.forEach((e) => {
                logInfo(requestID, `Rejection reason: ${inspect(e.reason, true, null, true)}`);
            });
        }

        const results = fulfilled.map((e) => e.value);
        return {
            status: rejected.length === 0 ? 'success' : 'partial',
            data: results,
        };
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
    import ShallowQueryByEventResponse = FileBindingResponse.ShallowQueryByEventResponse;
    import EventRepresentation = EventValidators.EventRepresentation;
    import FileRepresentation = FileValidators.FileRepresentation;

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver is not defined');

            logInfo(requestID, `Request has been made to resolve event ${data.id}, resolving author, state, ents, and venues`);

            return {
                ...data,
                author: await resolver.resolveUser(data.author, userID),
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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve comment ${data.id} on asset ${data.assetType}:${data.assetID}, resolving attendedBy and poster`);

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve venue ${data.id}, resolving user`);

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve equipment ${data.id}, resolving location and manager`);

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve file ${data.id}, resolving owner`);

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve signup ${data.id}, resolving user, event`);

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
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve events for file bindings ${data.join(',')}`);

            const results = await Promise.allSettled(data.map((e) => resolver.resolveEvent(e, userID)));
            const failed = results.filter((e) => e.status === 'rejected').length;
            const successful = results.filter((e) => e.status === 'fulfilled') as PromiseFulfilledResult<EventRepresentation>[];

            return {
                status: failed > 0 ? 'partial' : 'success',
                data: successful.map((e) => e.value),
            };
        };
    }

    export function resolveFilesForFileBinding(
        resolver: EntityResolver | undefined,
        userID: string,
    ): FilesFileBindingTransformer {
        return async (data, requestID) => {
            if (resolver === undefined) throw new Error('Resolver not defined');

            logInfo(requestID, `Request has been made to resolve files for file bindings ${data.join(',')}`);

            const results = await Promise.allSettled(data.map((e) => resolver.resolveFile(e, userID)));
            const failed = results.filter((e) => e.status === 'rejected').length;
            const successful = results.filter((e) => e.status === 'fulfilled') as PromiseFulfilledResult<FileRepresentation>[];

            return {
                status: failed > 0 ? 'partial' : 'success',
                data: successful.map((e) => e.value),
            };
        };
    }

}
