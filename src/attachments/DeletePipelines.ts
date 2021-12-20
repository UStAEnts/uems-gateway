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

import { DiscoveryMessage, DiscoveryResponse, has } from '@uems/uemscommlib';
import { EntityResolver } from "../resolver/EntityResolver";
import { GatewayMk2 } from "../Gateway";
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;
import { Constants } from "../utilities/Constants";
import ROUTING_KEY = Constants.ROUTING_KEY;
import { MessageUtilities } from "../utilities/MessageUtilities";
import { DiscoveryValidators } from "@uems/uemscommlib/build/discovery/DiscoveryValidators";
import DiscoveryResponseValidator = DiscoveryValidators.DiscoveryResponseValidator;

type ServiceName = 'event.dionysus' | 'state.athena' | 'file.hermes' | 'venue.tartarus' | 'user.hera' |
    'equipment.hephaestus';
const SERVICE_NAME: ServiceName[] = [
    'event.dionysus',
    'state.athena',
    'file.hermes',
    'venue.tartarus',
    'user.hera',
    'equipment.hephaestus',
];

const DISCOVER_KEYS: Record<ServiceName, string[]> = {
    'state.athena': [ROUTING_KEY.ent.discover, ROUTING_KEY.states.discover, ROUTING_KEY.topic.discover],
    'equipment.hephaestus': [ROUTING_KEY.equipment.discover],
    'event.dionysus': [ROUTING_KEY.event.discover, ROUTING_KEY.signups.discover],
    'file.hermes': [ROUTING_KEY.file.discover, ROUTING_KEY.fileBinding.discover],
    'user.hera': [ROUTING_KEY.user.discover],
    'venue.tartarus': [ROUTING_KEY.venues.discover],
};

const DELETE_KEYS: Record<ServiceName, string[]> = {
    'state.athena': [ROUTING_KEY.ent.delete, ROUTING_KEY.states.delete, ROUTING_KEY.topic.delete],
    'equipment.hephaestus': [ROUTING_KEY.equipment.delete],
    'event.dionysus': [ROUTING_KEY.event.delete, ROUTING_KEY.signups.delete],
    'file.hermes': [ROUTING_KEY.file.delete, ROUTING_KEY.fileBinding.delete],
    'user.hera': [ROUTING_KEY.user.delete],
    'venue.tartarus': [ROUTING_KEY.venues.delete],
};

/**
 * Records properties of a pipeline that has not yet executed. This is just the status as there is no additional data
 * to be stored with the status
 */
type PendingPipeline = {
    status: 'pending',
};

/**
 * Records the properties of a pipeline that has failed. This status contains the time and errors of every failure to
 * execute as well as the time at which the next retry should happen.
 */
type FailedPipeline = {
    status: 'failed',
    errors: {
        time: number,
        error: string,
    }[],
    nextRetry: number,
};

/**
 * Records the properties of a pipeline that has succeeded, holds when it succeeded and how many attempts it took to be
 * successful for error reporting
 */
type SuccessfulPipeline = {
    status: 'success',
    completed: number,
    attempts: number,
};

/**
 * Composite type for {@link PendingPipeline}, {@link FailedPipeline} and {@link SuccessfulPipeline}..
 */
type PipelineStatus = PendingPipeline | FailedPipeline | SuccessfulPipeline;

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

/**
 * Represents a pipeline which interacts with multiple services tracking the asset information and the state of the
 * pipelines executing against each service
 */
type DeletePipeline = {
    /**
     * The entity which should be deleted from across all services
     */
    entity: EntityIdentifier,
    /**
     * Contains whether this pipeline has been started yet
     */
    started: boolean,
    /**
     * The response of discovery finding where this record is present on other services.
     */
    discovery: {
        /**
         * The responses of each service
         */
        responses: Record<ServiceName, DiscoveryResponse.DiscoverResponse | null>,
        /**
         * When the process was started to allow for timing out of delete requests
         */
        started: number,
        /**
         * When the discovery phase ended
         */
        ended?: number,
    },
    /**
     * The computed set of services which contain any references to this entity from the discovery phase. These are
     * the only services which will receive full delete messages
     */
    relevantServices: ServiceName[],
    /**
     * The actions actually being executed on remote services, these should either be in the pending, running or failed
     * states.
     */
    actions: Record<ServiceName, PipelineStatus>,
    /**
     * The resolver instance associated with this delete request
     */
    resolver: EntityResolver,
};

export class DeletePipelineManager {

    private _activePipelines: DeletePipeline[] = [];

    private _deleteLogDescriptor: number | undefined;

    private _handler: GatewayMessageHandler;

    constructor(handler: GatewayMk2.GatewayMessageHandler) {
        this._handler = handler;
    }

    private handleDeleteReply(pipeline: DeletePipeline, service: ServiceName) {
        if (pipeline.actions[service].status === 'pending') {
            pipeline.actions[service] = {
                status: ''
            }
        }
    }

    private finishDiscovery(pipeline: DeletePipeline) {
        const failed = Object.entries(pipeline.discovery.responses)
            .filter((e) => e[1] === null);
        if (failed.length > 0) throw new Error('one pipeline has failed');

        // Check if there are any that reject this deletion
        const restrict = Object.entries(pipeline.discovery.responses)
            .filter((a) => a[1] != null && a[1].restrict > 0).length;
        if (restrict > 0) throw new Error('cannot delete');

        // Figure out which pipelines need handled
        const targetedServices = Object.entries(pipeline.discovery.responses)
            .filter((a) => a[1] != null && a[1].modify > 0)
            .map((e) => e[0]) as ServiceName[];

        // Mark them all as pending and then we need to send the messages
        pipeline.relevantServices = targetedServices;
        for (const service of targetedServices) {
            pipeline.actions[service] = {
                status: 'pending',
            };
        }

        const message: DiscoveryMessage.DeleteMessage = {
            assetType: pipeline.entity.assetType,
            assetID: pipeline.entity.assetID,
            status: 0,
            userID: 'anonymous',
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
            execute: true,
        };

        const makeMessage = (service: ServiceName) => {
            const id = MessageUtilities.generateMessageIdentifier();
            const handler = this.handleDeleteReply(pipeline, service);
            this._handler.interceptResponseCallback(id, handler, () => handler(null));
            return {
                ...message,
                msg_id: id,
            };
        };

        // Transmit the delete messages
        for (const service of targetedServices) {
            DELETE_KEYS[service].forEach((s) => this._handler.publish(s, makeMessage(service)));
        }
    }

    private handleDiscoveryReply(pipeline: DeletePipeline, service: ServiceName) {
        return async (entity: any | null) => {
            const validation = await new DiscoveryResponseValidator().validate(entity);
            if (!validation) {
                if (!has(pipeline.discovery.responses, service)) pipeline.discovery.responses[service] = null;
            } else {
                pipeline.discovery.responses[service] = entity;
            }

            if (Object.keys(pipeline.discovery.responses).length === SERVICE_NAME.length) {
                // All response have been received, move on to next stage
                this.finishDiscovery(pipeline);
            }
        };
    }

    protected executeDiscovery(pipeline: DeletePipeline) {
        pipeline.started = true;

        const message: DiscoveryMessage.DiscoverMessage = {
            assetType: pipeline.entity.assetType,
            assetID: pipeline.entity.assetID,
            status: 0,
            userID: 'anonymous',
            msg_id: MessageUtilities.generateMessageIdentifier(),
            msg_intention: 'READ',
        };

        const makeMessage = (service: ServiceName) => {
            const id = MessageUtilities.generateMessageIdentifier();
            const handler = this.handleDiscoveryReply(pipeline, service);
            this._handler.interceptResponseCallback(id, handler, () => handler(null));
            return {
                ...message,
                msg_id: id,
            };
        };

        const validator = new DiscoveryResponseValidator().validate;

        this._handler.buildSend(ROUTING_KEY.ent.discover, makeMessage('state.athena'))
            .name('discover-ents')
            .timeout(4000)
            .onTimeout(() => undefined) // TODO: add timeout handling
            .reply(this.handleDiscoveryReply(pipeline, 'state.athena'))
            .fail(() => undefined) // TODO: add failure handling
            .validate(validator)
            .submit();

        this._handler.publish(ROUTING_KEY.ent.discover, makeMessage('state.athena'));
        this._handler.publish(ROUTING_KEY.equipment.discover, makeMessage('equipment.hephaestus'));
        this._handler.publish(ROUTING_KEY.event.discover, makeMessage('event.dionysus'));
        this._handler.publish(ROUTING_KEY.file.discover, makeMessage('file.hermes'));
        this._handler.publish(ROUTING_KEY.fileBinding.discover, makeMessage('file.hermes'));
        this._handler.publish(ROUTING_KEY.signups.discover, makeMessage('event.dionysus'));
        this._handler.publish(ROUTING_KEY.states.discover, makeMessage('state.athena'));
        this._handler.publish(ROUTING_KEY.topic.discover, makeMessage('state.athena'));
        this._handler.publish(ROUTING_KEY.user.discover, makeMessage('user.hera'));
        this._handler.publish(ROUTING_KEY.venues.discover, makeMessage('venue.tartarus'));
    }
}

function executeDiscovery(pipeline: DeletePipeline) {
    pipeline.started = true;

}
