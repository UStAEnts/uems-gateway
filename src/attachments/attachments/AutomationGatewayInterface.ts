import { EntityResolver } from "../../resolver/EntityResolver";
import { GatewayMk2 } from "../../Gateway";
import { Configuration } from "../../configuration/Configuration";
import { Request, Response } from "express";
import { describe, endpoint, Method, tag } from "../../decorators/endpoint";
import * as zod from 'zod';
import { AutomationValidators } from "@uems/uemscommlib/build/automation/AutomationValidators";
import Attachment = GatewayMk2.Attachment;
import ZAutomationV0 = AutomationValidators.ZAutomationV0;
import AutomationCreate = AutomationValidators.AutomationCreate;
import AutomationUpdate = AutomationValidators.AutomationUpdate;

type QueryQueryType = {
    id: string | string[],
    author: string,
    created: {
        greater?: number,
        less?: number,
    } | number,
    update: {
        greater?: number,
        less?: number,
    } | number,
};
type CreateBodyType = Omit<AutomationCreate, 'userID' | 'msg_id' | 'msg_intention' | 'requestID' | 'userScoped' | 'status'>;
type UpdateBodyType = Omit<AutomationUpdate, 'userID' | 'msg_id' | 'msg_intention' | 'requestID' | 'userScoped' | 'status'>;

export class AutomationGatewayInterface extends Attachment {
    constructor(
        resolver: EntityResolver,
        handler: GatewayMk2.GatewayMessageHandler,
        send: GatewayMk2.SendRequestFunction,
        config: Configuration,
    ) {
        super(resolver, handler, send, config);
    }

    @endpoint(
        Method.GET,
        ['automation'],
        ['AutomationList', zod.array(ZAutomationV0)],
        ['ops', 'ents', 'admin'],
        zod.object({
            id: zod.string()
                .or(zod.array(zod.string())),
            author: zod.string(),
            created: zod.object({
                greater: zod.number()
                    .optional(),
                less: zod.number()
                    .optional(),
            })
                .or(zod.number()),
            update: zod.object({
                greater: zod.number()
                    .optional(),
                less: zod.number()
                    .optional(),
            })
                .or(zod.number()),
        }),
    )
    @describe(
        'Search automations',
        'Query the list of automations which are currently registered on the system',
    )
    @tag('automation')
    public async query(req: Request, res: Response, query: QueryQueryType, _: undefined) {

    }

    @endpoint(
        Method.GET,
        ['automation', {
            key: 'id',
            description: 'The identifier for this automation',
        }],
        ['Automation', ZAutomationV0],
        ['ops', 'ents', 'admin'],
    )
    @tag('automation')
    @describe(
        'Fetch an automation',
        'Retrieves a single automation from the provided ID',
    )
    public async get(req: Request, res: Response, _0: undefined, _1: undefined) {

    }

    @endpoint(
        Method.POST,
        ['automation'],
        ['ModifyResponse', zod.array(zod.string())],
        ['ops', 'ents', 'admin'],
        undefined,
        zod.object({
            nodes: zod.array(
                zod.object({
                    width: zod.number()
                        .or(zod.null())
                        .optional(),
                    height: zod.number()
                        .or(zod.null())
                        .optional(),
                    id: zod.string(),
                    type: zod.string()
                        .optional(),
                    position: zod.object({
                        x: zod.number(),
                        y: zod.number(),
                    }),
                    positionAbsolute: zod
                        .object({
                            x: zod.number(),
                            y: zod.number(),
                        })
                        .optional(),
                    data: zod.object({}),
                    selected: zod.boolean()
                        .optional(),
                    dragging: zod.boolean()
                        .optional(),
                }),
            ),
            edges: zod.array(
                zod.object({
                    animated: zod.boolean()
                        .optional(),
                    type: zod.string()
                        .optional(),
                    source: zod.string(),
                    target: zod.string(),
                    sourceHandle: zod.string()
                        .or(zod.null())
                        .optional(),
                    targetHandle: zod.string()
                        .or(zod.null())
                        .optional(),
                    id: zod.string(),
                    label: zod.string(),
                }),
            ),
            viewport: zod.object({
                x: zod.number(),
                y: zod.number(),
                zoom: zod.number(),
            }),
            state: zod.record(zod.any()),
            description: zod.string(),
            title: zod.string(),
        }),
    )
    @tag('automation')
    @describe(
        'Create a new automation',
        'This will create a new automation and schedule it for execution the next time its triggers are activated',
    )
    public async create(req: Request, res: Response, _: undefined, body: CreateBodyType) {
    }

    @endpoint(
        Method.DELETE,
        ['automation', {
            key: 'id',
            description: 'The unique ID for the automation',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ents', 'admin', 'ops'],
    )
    @tag('automation')
    @describe(
        'Delete an automation state',
        'Deletes an automation from the system provided there are no other objects depending on this object',
    )
    public async delete(req: Request, res: Response, _0: undefined, _1: undefined) {

    }

    @endpoint(
        Method.PATCH,
        ['automation', {
            key: 'id',
            description: 'The unique ID for the automation',
        }],
        ['ModifyResponse', zod.array(zod.string())],
        ['ents', 'admin', 'ops'],
        undefined,
        zod.object({
            id: zod.string()
                .describe('The identifier of the automation to update'),
            description: zod.string()
                .describe('The description providing detail about the function of this automation')
                .optional(),
            title: zod.string()
                .describe('The name of this automation flow')
                .optional(),
            nodes: zod.array(
                zod.object({
                    width: zod.number()
                        .or(zod.null())
                        .optional(),
                    height: zod.number()
                        .or(zod.null())
                        .optional(),
                    id: zod.string(),
                    type: zod.string()
                        .optional(),
                    position: zod.object({
                        x: zod.number(),
                        y: zod.number(),
                    }),
                    positionAbsolute: zod
                        .object({
                            x: zod.number(),
                            y: zod.number(),
                        })
                        .optional(),
                    data: zod.object({}),
                    selected: zod.boolean()
                        .optional(),
                    dragging: zod.boolean()
                        .optional(),
                }),
            )
                .describe('The set of nodes which form the automation configuration')
                .optional(),
            edges: zod.array(
                zod.object({
                    animated: zod.boolean()
                        .optional(),
                    type: zod.string()
                        .optional(),
                    source: zod.string(),
                    target: zod.string(),
                    sourceHandle: zod.string()
                        .or(zod.null())
                        .optional(),
                    targetHandle: zod.string()
                        .or(zod.null())
                        .optional(),
                    id: zod.string(),
                    label: zod.string(),
                }),
            )
                .optional(),
            viewport: zod.object({
                x: zod.number(),
                y: zod.number(),
                zoom: zod.number(),
            })
                .optional(),
            state: zod.record(zod.any())
                .optional(),
        }),
    )
    public async update(req: Request, res: Response, _: undefined, body: UpdateBodyType) {
    }

}