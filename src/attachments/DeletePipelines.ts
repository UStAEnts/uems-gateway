/* eslint-disable no-param-reassign */
// Deleting in a microservice architecture is a little bit complicated and we need to handle all cases in case something
// goes wrong and to ensure we don't end up with corrupted records.
// The general procedure for the delete pipeline is like so:
// Data Deletion Pipeline
// * Delete request is received by `gateway`
// * `discovery` request is sent to all services
//   * each service responds the following counts of data
//     * Dependent (restrict) - Data that depends on the given piece of data that prevents the deletion of the original
//       piece of data (this should be avoided where possible)
//     * Dependent (loose) - Data that depends on the given piece of data that does not prevent the deletion of the
//       original piece of data (this should be common)
//       * State with Event
//   * If `dependent[restrict] > 0` then cancel the request and error out
// * If request has no `dependent[restrict]` then we can continue the operation
// * The `DELETE` request is forwarded to all services and they update their records where relevant
// * Persist the delete into a delete log
//
// Conditions that need considered
// * What if a service is dead?
//     Will need to timeout the request and fail it. If its dead during discovery we can cancel the entire delete.
// * What if a service is alive to answer the discovery but dies before / during the delete?
//     Deletes will have already happened on some services so its not possible to undo at this point. IDs need to be
//     saved to the delete log so the gateway can catch them. The delete instruction needs to be cached and retried
//     periodically until the service is available again (including between restarts of the gateway).
// * What if there are multiple services?
//     The queue structure should ensure that only one service receives it and each service should be running off a
//     shared data store. This may need to be revisited if that structure changes.
// * What if there is a cache in operation?
//     Keys need to be purged from the local cache immediately and we must prevent sending them
// * What if a service fails to delete a record?
//     See 2nd point
//
// Considerations
// * Delete log
//     This could easily get massive. A complete log should be persisted for record keeping but the in memory version
//     should only contain the IDs of assets which have not completed their entire pipeline yet

import { DiscoveryMessage, DiscoveryResponse } from '@uems/uemscommlib';
import { EntityResolver } from '../resolver/EntityResolver';
import { GatewayMk2 } from '../Gateway';
import { Constants } from '../utilities/Constants';
import { MessageUtilities } from '../utilities/MessageUtilities';
import { DiscoveryValidators } from '@uems/uemscommlib/build/discovery/DiscoveryValidators';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import ROUTING_KEY = Constants.ROUTING_KEY;
import DiscoveryResponseValidator = DiscoveryValidators.DiscoveryResponseValidator;
import { _byFile } from "../log/Log";
import { Response } from "express";
import { constants } from "http2";
import { ErrorCodes } from "../constants/ErrorCodes";

const _l = _byFile(__filename);
type Entity = 'ent' | 'state' | 'topic' | 'equipment' | 'event' | 'signup' | 'file' | 'user' | 'venue';
const ENTITIES: Entity[] = [
    'ent', 'state', 'topic', 'equipment', 'event', 'signup', 'file', 'user', 'venue',
];

const ROUTING_KEY_MAPPING: Record<Entity, { discover: string, delete: string }> = {
    ent: ROUTING_KEY.ent,
    equipment: ROUTING_KEY.equipment,
    event: ROUTING_KEY.event,
    file: ROUTING_KEY.file,
    signup: ROUTING_KEY.signups,
    state: ROUTING_KEY.states,
    topic: ROUTING_KEY.topic,
    user: ROUTING_KEY.user,
    venue: ROUTING_KEY.venues,
};

/**
 * Contains the pipelines which are currently being executed or are waiting to be executed. Any records in this should
 * be waiting to execute in some way, completed records should be ejected and saved to disk
 */

/**
 * Identifies a single entity across the system
 */
type EntityIdentifier = {
    assetType: DiscoveryMessage.DeleteMessage['assetType'],
    assetID: DiscoveryMessage.DeleteMessage['assetID'],
};

enum DeleteState {
    /**
     * Waiting for the pipeline to be started. Indicates that the pipeline has been created but no messages have yet
     * been sent
     */
    AWAIT_START,
    /**
     * Messages have been sent to the external services and are waiting for a reply from the microservices.
     */
    AWAIT_REPLY,
    /**
     * The results have been received from the microservices and are waiting to be processed to determine the next step.
     */
    PROCESSING,
    /**
     * Delete messages have been sent to the services but have not received confirmation from them all yet that the
     * action was successful.
     */
    AWAIT_CONFIRM,
    /**
     * Waiting to process all the delete reply messages
     */
    DELETE_PROCESSING,
    /**
     * Pipeline has concluded with all steps occurring successfully.
     */
    SUCCESSFUL,
    /**
     * The process has failed at some point during the process.
     */
    FAILED,
}

export class DeleteAction {
    private _identifier: number;

    private _entity: EntityIdentifier;

    private _state: DeleteState;

    private _startTime: number | null = null;

    private _discoveryResponses: Partial<Record<Entity, DiscoveryResponse.DiscoverResponse>> = {};

    private _deleteResponses: Partial<Record<Entity, DiscoveryResponse.DeleteResponse>> = {};

    private _resolver: EntityResolver;

    private _targets?: Entity[];

    private _handler: GatewayMessageHandler;

    private _onSuccess?: () => void;

    private _onFailure?: (success: Entity[], fail: Entity[], error?: Error) => void;

    private _onDependents?: () => void;

    private _localOnly: boolean;

    constructor(
        entity: EntityIdentifier,
        resolver: EntityResolver,
        handler: GatewayMessageHandler,
        localOnly: boolean,
    ) {
        this._entity = entity;
        this._resolver = resolver;
        this._handler = handler;
        this._identifier = Math.floor(10000 * Math.random());
        this._state = DeleteState.AWAIT_START;
        this._localOnly = localOnly;

        _l.debug('Request to delete entity', { entity });
    }

    private fail(error: string): void;
    private fail(error: string, success: Entity[], failure: Entity[]): void;
    private fail(error: string, success?: Entity[], failure?: Entity[]): void {
        _l.debug('Request to delete entity has failed', {
            entity: this._entity,
            reason: error,
        });

        this._state = DeleteState.FAILED;
        if (this._onFailure) {
            this._onFailure(success ?? [], failure ?? ENTITIES, new Error(error));
        } else {
            throw new Error(`Error: ${error} (success: ${success ?? []} | fail: ${failure ?? ENTITIES})`);
        }
    }

    public execute() {
        if (this._state !== DeleteState.AWAIT_START) {
            this.fail('Delete pipeline cannot be executed when it is already started');
            return;
        }
        _l.debug('Delete has begun', { entity: this._entity });

        // For each service we want to transmit a new message
        const validate = new DiscoveryResponseValidator();
        const validator = validate.validate.bind(validate);

        const make: (() => DiscoveryMessage.DiscoverMessage) = () => ({
            assetType: this._entity.assetType,
            assetID: this._entity.assetID,
            status: 0,
            userID: 'anonymous',
            msg_intention: 'READ',
            msg_id: MessageUtilities.generateMessageIdentifier(),
            localAssetOnly: this._localOnly,
        });

        this._state = DeleteState.AWAIT_REPLY;
        ENTITIES.forEach((entity) => {
            this._handler.buildSend(ROUTING_KEY_MAPPING[entity].discover, make())
                .name(`discover.${entity}`)
                .timeout(4000)
                .onTimeout(() => this.handleTimeout(entity)) // TODO: add timeout handling
                .reply((r) => this.handleDiscoverReply(entity, r))
                .fail(() => this.handleFailure(entity)) // TODO: add failure handling
                .validate(validator)
                .submit();
        });
    }

    private handleDiscoverReply(entity: Entity, response: DiscoveryResponse.DiscoverResponse) {
        if (this._state !== DeleteState.AWAIT_REPLY) return;
        _l.debug(`Discover received from ${entity}`, {
            entity: this._entity,
            response,
        });

        this._discoveryResponses[entity] = response;

        // If every key as a reply response now we can move into processing
        if (ENTITIES.every((service) => this._discoveryResponses[service] !== undefined)) {
            this._state = DeleteState.PROCESSING;
            this.process();
        }
    }

    private process() {
        if (this._state !== DeleteState.PROCESSING) return;

        const restrict = Object.values(this._discoveryResponses)
            .filter((e) => e && e.restrict > 0).length;
        this._targets = Object.entries(this._discoveryResponses)
            .filter((e) => e[1] && e[1].modify > 0)
            .map((e) => e[0]) as Entity[];

        _l.debug('Processing', {
            entity: this._entity,
            restrict,
            target: this._targets,
        });

        if (restrict > 0) {
            const restricted = Object.entries(this._discoveryResponses)
                .filter((e) => (e[1]?.restrict ?? 0) > 0)
                .map((e) => e[0]);
            if (this._onDependents) {
                this._onDependents();
            } else {
                this.fail(`Cannot delete this entity because services are depending on it: ${restricted}`);
            }
            return;
        }

        const make = (): DiscoveryMessage.DeleteMessage => ({
            assetType: this._entity.assetType,
            assetID: this._entity.assetID,
            status: 0,
            userID: 'anonymous',
            msg_intention: 'READ',
            msg_id: MessageUtilities.generateMessageIdentifier(),
            execute: true,
            localAssetOnly: this._localOnly,
        });

        const validator = new DiscoveryResponseValidator();
        const validateFunction = validator.validate.bind(validator);

        this._state = DeleteState.AWAIT_CONFIRM;
        this._targets.forEach((entity) => {
            this._handler.buildSend(ROUTING_KEY_MAPPING[entity].delete, make())
                .name(`delete.${entity}`)
                .timeout(4000)
                .onTimeout(() => this.handleTimeout(entity)) // TODO: add timeout handling
                .reply((r) => this.handleDeleteReply(entity, r))
                .fail(() => this.handleFailure(entity)) // TODO: add failure handling
                .validate(validateFunction)
                .submit();
        });
    }

    private handleDeleteReply(entity: Entity, response: DiscoveryResponse.DeleteResponse) {
        if (this._state !== DeleteState.AWAIT_CONFIRM) return;
        if (!this._targets) {
            this.fail('Targets is somehow undefined when trying to await confirmations');
            return;
        }

        _l.debug(`Delete response received from ${entity}`, {
            entity: this._entity,
            response,
        });

        this._deleteResponses[entity] = response;

        // If every key as a reply response now we can move into processing
        if (this._targets.every((service) => this._deleteResponses[service] !== undefined)) {
            this._state = DeleteState.DELETE_PROCESSING;
            this.conclude();
        }
    }

    private conclude() {
        if (this._state !== DeleteState.DELETE_PROCESSING) return;
        if (this._targets === undefined) {
            this.fail('targets undefined in delete_processing state');
            return;
        }

        const successful = Object.values(this._deleteResponses)
            .filter((e) => e && e.successful).length;

        _l.debug('Concluded', {
            entity: this._entity,
            successful,
        });

        if (successful !== this._targets.length) {
            const failed = Object.values(this._deleteResponses)
                .filter((e) => e && !e.successful);
            this.fail(`Some targets were not successful: ${failed}`);
            return;
        }

        this._state = DeleteState.SUCCESSFUL;
        if (this._onSuccess) this._onSuccess();
    }

    private handleFailure(service: Entity) {
        this.fail(`Failure received: ${service}`, [], [service]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    private handleTimeout(service: Entity) {
        _l.debug('Timeout for service received', {
            entity: this._entity,
            service,
        });
        // TODO: timeout?
    }

    set onDependents(value: () => void) {
        this._onDependents = value;
    }

    set onSuccess(value: () => void) {
        this._onSuccess = value;
    }

    set onFailure(value: (success: Entity[], fail: Entity[], error?: Error) => void) {
        this._onFailure = value;
    }
}

export function removeEntity(
    entity: EntityIdentifier,
    resolver: EntityResolver,
    handler: GatewayMessageHandler,
    localOnly: boolean = true,
) {
    return new Promise<void>((res, rej) => {
        const action = new DeleteAction(entity, resolver, handler, localOnly);
        action.onFailure = rej;
        action.onSuccess = res;
        action.execute();
    });
}

export function removeAndReply(
    entity: EntityIdentifier,
    resolver: EntityResolver,
    handler: GatewayMessageHandler,
    response: Response,
    localOnly: boolean = true,
) {
    return new Promise<boolean>((resolve, reject) => {

        const pipeline = new DeleteAction(entity, resolver, handler, localOnly);

        pipeline.onSuccess = () => {
            response.status(constants.HTTP_STATUS_OK)
                .json(MessageUtilities.wrapInSuccess(entity.assetID));
            resolve(true);
        };

        pipeline.onDependents = () => {
            response.status(constants.HTTP_STATUS_CONFLICT)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.DEPENDENTS));
            resolve(false);
        };

        pipeline.onFailure = (success, fail, error) => {
            response
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure(ErrorCodes.FAILED));
            _l.error('Failed to delete due to an error', {
                success,
                fail,
                error,
            });
            reject(error);
        };

        pipeline.execute();
    });
}
