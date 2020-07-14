// The gateway types as defined by the external API.

import { EventRes } from '@uems/uemscommlib';

export type EventResponse = {
    id: string,
    name: string,
    startDate: Number,
    endDate: Number
};

export function InternalEventToEventResponse(ie: EventRes.InternalEvent): EventResponse {
    return {
        id: ie.event_id,
        name: ie.event_name,
        startDate: ie.event_start_date,
        endDate: ie.event_end_date,
    };
}
