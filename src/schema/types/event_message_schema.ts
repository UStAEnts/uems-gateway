export enum MsgIntention {
    CREATE, READ, UPDATE, DELETE
}

// A string is used because the work of parsing etc. of numbers is deferred to the backend microservices.
export type UemsDateTime = String;

export type UemsDateTimeRange = {
    start?: UemsDateTime,
    end?: UemsDateTime
}

export type CreateEventMsg = {
    msg_id: Number,
    status: Number,
    msg_intention: MsgIntention.CREATE,
    event_name: String,
    event_start_date: UemsDateTime,
    event_end_date: UemsDateTime,
    venue_ids: [String],
    predicted_attendance: Number
}

export type ReadEventMsg = {
    msg_id: Number,
    status: Number,
    msg_intention: MsgIntention.READ,
    event_id?: String,
    event_name?: String,
    event_start_date_range?: UemsDateTimeRange,
    event_end_date_range?: UemsDateTimeRange,
    venue_ids?: [String],
    attendance?: Number
}

export type UpdateEventMsg = {
    msg_id: Number,
    status: Number,
    msg_intention: MsgIntention.UPDATE,
    event_id: String,
    event_name?: String,
    event_start_date?: UemsDateTime,
    event_end_date?: UemsDateTime,
    venue_ids?: [String],
    predicted_attendance?: Number
}

export type DeleteEventMsg = {
    msg_id: Number,
    status: Number,
    msg_intention: MsgIntention.DELETE,
    event_id: String,
}

export type EventMsg = CreateEventMsg | ReadEventMsg | UpdateEventMsg | DeleteEventMsg;