// The gateway types as defined by the external API.

import { EntStateResponse, EventRes, StateResponse } from '@uems/uemscommlib';
import InternalEntState = EntStateResponse.InternalEntState;
import InternalState = StateResponse.InternalState;

export type EventResponse = {
    id: string,
    name: string,
    startDate: Number,
    endDate: Number,
    attendance: number,
    ents?: InternalEntState,
    state?: InternalState,
};

export type CreateEventResponse = {
    status: string,
    result: EventResponse,
};

export function InternalEventToEventResponse(ie: EventRes.InternalEvent): EventResponse {
    return {
        id: ie.event_id,
        name: ie.event_name,
        startDate: ie.event_start_date,
        endDate: ie.event_end_date,
        attendance: ie.attendance,

        // @ts-ignore - TODO: move to comms lib
        ents: ie.ents,
        // @ts-ignore - TODO: move to comms lib
        state: ie.state,
    };
}
