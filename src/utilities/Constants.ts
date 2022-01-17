export namespace Constants {

    export const ROUTING_KEY = {
        ent: {
            create: 'ents.details.create',
            delete: 'ents.details.delete',
            update: 'ents.details.update',
            read: 'ents.details.get',
            discover: 'ents.details.discover',
        },
        equipment: {
            create: 'equipment.details.create',
            delete: 'equipment.details.delete',
            update: 'equipment.details.update',
            read: 'equipment.details.get',
            discover: 'equipment.details.discover',
        },
        event: {
            create: 'events.details.create',
            delete: 'events.details.delete',
            update: 'events.details.update',
            read: 'events.details.get',
            discover: 'events.details.discover',
            comments: {
                create: 'events.comment.create',
                update: 'events.comment.update',
                delete: 'events.comment.delete',
                read: 'events.comment.get',
            }
        },
        file: {
            create: 'file.details.create',
            delete: 'file.details.delete',
            update: 'file.details.update',
            read: 'file.details.get',
            discover: 'file.details.discover',
        },
        fileBinding: {
            create: 'file.events.create',
            delete: 'file.events.delete',
            update: 'file.events.update',
            read: 'file.events.read',
            discover: 'file.events.discover',
        },
        signups: {
            create: 'events.signups.create',
            delete: 'events.signups.delete',
            update: 'events.signups.update',
            read: 'events.signups.get',
            discover: 'events.signups.discover',
        },
        states: {
            create: 'states.details.create',
            delete: 'states.details.delete',
            update: 'states.details.update',
            read: 'states.details.get',
            discover: 'states.details.discover',
        },
        topic: {
            create: 'topics.details.create',
            delete: 'topics.details.delete',
            update: 'topics.details.update',
            read: 'topics.details.get',
            discover: 'topics.details.discover',
        },
        user: {
            create: 'user.details.create',
            delete: 'user.details.delete',
            update: 'user.details.update',
            read: 'user.details.get',
            discover: 'user.details.discover',
        },
        venues: {
            create: 'venues.details.create',
            delete: 'venues.details.delete',
            update: 'venues.details.update',
            read: 'venues.details.get',
            discover: 'venues.details.discover',
        },
    };

}