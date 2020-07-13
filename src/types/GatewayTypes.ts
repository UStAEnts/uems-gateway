// The gateway types as defined by the external API.

import { InternalEvent } from '../../../uemsCommLib/src/messaging/types/event_response_schema';

export type EventResponse = {
    id: string,
    name: string,
    startDate: Number,
    endDate: Number
};

export function InternalEventToEventResponse(ie: InternalEvent): EventResponse {
    return {
        id: ie.event_id,
        name: ie.event_name,
        startDate: ie.event_start_date,
        endDate: ie.event_end_date,
    };
}
