import 'reflect-metadata';
import { GatewayMk2, SecureRoles } from '../Gateway';
import { MessageUtilities } from '../utilities/MessageUtilities';
import CoercingValidator = MessageUtilities.CoercingValidator;
import * as zod from 'zod';
import { Request, RequestHandler, Response } from 'express';
import Attachment = GatewayMk2.Attachment;

export const DESCRIBE_SYMBOL = Symbol.for('describe');
export const ENDPOINT_SYMBOL = Symbol.for('endpoint');
export const TAG_SYMBOL = Symbol.for('tags');
export const WARN_SYMBOL = Symbol.for('warn');
export const ASANA_SYMBOL = Symbol.for('asana');

export enum Method {
    GET,
    POST,
    PATCH,
    DELETE,
}

export const asNumber = () => zod.preprocess((v) => Number(v), zod.number());

export function methodToString(method: Method): 'get' | 'delete' | 'post' | 'patch' {
    switch (method) {
        case Method.GET:
            return 'get';
        case Method.POST:
            return 'post';
        case Method.PATCH:
            return 'patch';
        case Method.DELETE:
            return 'delete';
        default:
            throw new Error('Invalid method');
    }
}

export type DescriptionData = {
    description: string,
    summary: string,
}

type RouteComponent = string | { key: string, description: string };
type Route = [RouteComponent, ...RouteComponent[]];

export interface EndpointFunction<QT, BT> {
    (req: Request<any, any, any, any>, res: Response<any>, query: QT, body: BT): (Promise<void>);
}

export type EndpointInfo = {
    method: Method,
    route: Route,
    simpleRoute: string,
    reply: [string, zod.ZodTypeAny] | [string, zod.ZodTypeAny, 'override'],
    roles?: SecureRoles[],
    query?: zod.ZodTypeAny,
    body?: zod.ZodTypeAny,
    handler: (req: Request, res: Response, query: unknown, body: unknown) => Promise<void>,
    warning?: string,
};

function metadataFunction<QB, BT, T>(
    key: symbol,
    reducer: (current: T | undefined, target: any, propertyKey: string, descriptor: any) => T,
) {
    return (target: any, propertyKey: string, descriptor: any): TypedPropertyDescriptor<EndpointFunction<QB, BT>> => {
        Reflect.defineMetadata(
            propertyKey,
            {
                ...Reflect.getMetadata(propertyKey, target),
                [key]: reducer((Reflect.getMetadata(propertyKey, target)??{})[key], target, propertyKey, descriptor),
            },
            target,
        );

        return descriptor;
    };
}

function metadataFunctionAny<T>(key: symbol, reducer: (current: T | undefined) => T) {
    return metadataFunction<any, any, T>(key, reducer);
}

export function endpoint<ZQT extends zod.ZodTypeAny,
    ZBT extends zod.ZodTypeAny,
    QT extends zod.infer<ZQT>,
    BT extends zod.infer<ZBT>>(
    method: Method.GET | Method.DELETE,
    route: Route,
    reply: [string, zod.ZodTypeAny] | [string, zod.ZodTypeAny, 'override'],
    roles?: SecureRoles[],
    query?: ZQT,
): (target: any, propertyKey: string, descriptor: any) => TypedPropertyDescriptor<EndpointFunction<QT, BT>>;
export function endpoint<ZQT extends zod.ZodTypeAny,
    ZBT extends zod.ZodTypeAny,
    QT extends zod.infer<ZQT>,
    BT extends zod.infer<ZBT>>(
    method: Method.POST | Method.PATCH,
    route: Route,
    reply: [string, zod.ZodTypeAny] | [string, zod.ZodTypeAny, 'override'],
    roles?: SecureRoles[],
    query?: ZQT,
    body?: ZBT,
): (target: any, propertyKey: string, descriptor: any) => TypedPropertyDescriptor<EndpointFunction<QT, BT>>;
export function endpoint<ZQT extends zod.ZodTypeAny,
    ZBT extends zod.ZodTypeAny,
    QT extends zod.infer<ZQT>,
    BT extends zod.infer<ZBT>>(
    method: Method,
    route: Route,
    reply: [string, zod.ZodTypeAny] | [string, zod.ZodTypeAny, 'override'],
    roles?: SecureRoles[],
    query?: ZQT,
    body?: ZBT,
) {
    // @ts-ignore
    return metadataFunction<QT, BT, EndpointInfo>(ENDPOINT_SYMBOL, (old, target, property) => {
        console.log(target, property, target.send, Object.keys(target));
        return ({
            ...old,
            method,
            route,
            roles,
            query,
            body,
            simpleRoute: `/${route.map((e) => (typeof (e) === 'string' ? e : `:${e.key}`))
                .join('/')}`,
            reply,
            handler: target[property].bind(target),
        })
    });
    // return (target: any, propertyKey: string, descriptor: any): TypedPropertyDescriptor<EndpointFunction<QT, BT>>
    // => {
    //     Reflect.defineMetadata(
    //         propertyKey,
    //         {
    //             ...Reflect.getMetadata(propertyKey, target),
    //             [ENDPOINT_SYMBOL]: {
    //                 method,
    //                 route,
    //                 roles,
    //                 query,
    //                 body,
    //                 simpleRoute: `/${route.map((e) => (typeof (e) === 'string' ? e : `:${e.key}`))
    //                     .join('/')}`,
    //                 reply,
    //                 handler: target,
    //             } as EndpointInfo,
    //         },
    //         target,
    //     );
    //
    //     return descriptor;
    // };
}

export function tag(...tags: string[]) {
    return metadataFunctionAny<string[]>(TAG_SYMBOL, (old) => [...(old ?? []), ...tags]);
    // return (target: any, propertyKey: string, descriptor: any): TypedPropertyDescriptor<EndpointFunction<any,
    // any>> => {
    //     Reflect.defineMetadata(
    //         propertyKey,
    //         {
    //             ...Reflect.getMetadata(propertyKey, target),
    //             [TAG_SYMBOL]: [
    //                 ...(Reflect.getMetadata(propertyKey, target)[TAG_SYMBOL] ?? []),
    //                 ...(tags),
    //             ],
    //         },
    //         target,
    //     );
    //
    //     return descriptor;
    // };
}

export function warn(warning: string) {
    return metadataFunctionAny<string>(WARN_SYMBOL, () => warning);
    // return (target: any, propertyKey: string, descriptor: any): TypedPropertyDescriptor<EndpointFunction<any,
    // any>> => {
    //     Reflect.defineMetadata(
    //         propertyKey,
    //         {
    //             ...Reflect.getMetadata(propertyKey, target),
    //             [WARN_SYMBOL]: warning,
    //         },
    //         target,
    //     );
    //
    //     return descriptor;
    // };
}

export function describe(summary: string, description: string) {
    return metadataFunctionAny<DescriptionData>(DESCRIBE_SYMBOL, (old) => ({
        ...old,
        description,
        summary,
    }));
    // return (target: any, propertyKey: string, descriptor: any): TypedPropertyDescriptor<EndpointFunction<any,
    // any>> => {
    //     Reflect.defineMetadata(
    //         propertyKey,
    //         {
    //             ...Reflect.getMetadata(propertyKey, target),
    //             [DESCRIBE_SYMBOL]: {
    //                 summary,
    //                 description,
    //             },
    //         },
    //         target,
    //     );
    //
    //     return descriptor;
    // };
}

export function asana(id: string, message?: string) {
    return metadataFunctionAny<{ id: string, message?: string }>(ASANA_SYMBOL, (old) => ({
        ...old,
        id,
        message: message ?? old?.message,
    }));
}

export const copyToIfDefined = <T extends any | undefined,
    K1 extends string,
    K2 extends string,
    Q extends Partial<Record<K1, T>>,
    O extends Partial<Record<K2, T>>>(key: K1, k2: K2, query: Q, output: O) => {
    if (query[key] !== undefined) {
        // eslint-disable-next-line no-param-reassign
        (output as Partial<Record<K2, T>>)[k2] = query[key];
    }
};
export const copyKeyIfDefined = <T extends any | undefined,
    K1 extends (keyof Q & keyof O) & string,
    Q extends Partial<Record<K1, T>>,
    O extends Partial<Record<K1, T>>>(key: K1, query: Q, output: O) => {
    copyToIfDefined(key, key, query, output);
};
export const copyKeysIfDefined = <T extends any | undefined,
    K1 extends (keyof Q & keyof O) & string,
    Q extends Partial<Record<K1, T>>,
    O extends Partial<Record<K1, T>>>(keys: K1[], query: Q, output: O) => {
    keys.map((key) => copyKeyIfDefined(key, query, output));
};
export const mapKeysIfDefined = <T extends any | undefined,
    K1 extends string,
    K2 extends string,
    Q extends Partial<Record<K1, T>>,
    O extends Partial<Record<K2, T>>>(mapping: Record<K1, K2>, query: Q, output: O) => {
    (Object.entries(mapping) as [K1, K2][]).forEach(([k, v]) => copyToIfDefined(k, v, query, output));
};

export function getAPIEndpoints(target: Attachment): EndpointInfo[] {
    const keys = Reflect.getMetadataKeys(target)
        .filter((key) => Reflect.getMetadata(key, target)[ENDPOINT_SYMBOL] !== undefined);
    return keys.map((key) => ({
        ...(Reflect.getMetadata(key, target)[ENDPOINT_SYMBOL] as EndpointInfo),
        handler: (target as any)[key].bind(target),
        warning: Reflect.getMetadata(key, target)[WARN_SYMBOL] ?? undefined,
    }));
}

export function getTags<T extends Attachment>(target: T, method: keyof T) {
    return (Reflect.getMetadata(method, target) ?? {})[TAG_SYMBOL] ?? [];
}

export function getDescription<T extends Attachment>(
    target: T,
    method: keyof T,
): { summary?: string, description?: string } | undefined {
    return (Reflect.getMetadata(method, target) ?? {})[DESCRIBE_SYMBOL];
}
