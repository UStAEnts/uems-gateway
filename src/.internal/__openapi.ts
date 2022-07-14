/* This is a CLI tool so is allowed to use console logging */
/* eslint-disable no-console */

// TODO:
// [ ] handle regex refinement on string values
// [ ] annotate required roles in openapi spec

import 'reflect-metadata';
import { ENDPOINT_SYMBOL, EndpointInfo, getAPIEndpoints, getDescription, getTags, Method } from '../decorators/endpoint';
import ROUTES from '../routes';
import { extendZodWithOpenApi, OpenAPIGenerator, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { GatewayMk2 } from '../Gateway';
import { ObjectUtilities } from '@uems/uemscommlib';
import fs from 'fs';
import Attachment = GatewayMk2.Attachment;
import has = ObjectUtilities.has;

function methodToString(method: Method): string {
    switch (method) {
        case Method.GET:
            return 'GET   ';
        case Method.POST:
            return 'POST  ';
        case Method.PATCH:
            return 'PATCH ';
        case Method.DELETE:
            return 'DELETE';
        default:
            throw new Error('Invalid method');
    }
}

const ansi = (
    prefix: string,
    suffix: string = '\u001b[0m',
) => ((
    strings: TemplateStringsArray,
    ...substitutions: any[]
) => `${prefix}${strings.map((e, i) => `${e}${substitutions[i] ?? ''}`)
    .join('')}${suffix}`);
const bold = ansi('\u001b[1m');
const italic = ansi('\u001b[3m');

extendZodWithOpenApi(z);

const methodSymbol = {
    [Method.GET]: '🔽️',
    [Method.POST]: '🔼',
    [Method.DELETE]: '🗑️ ',
    [Method.PATCH]: '🩹',
};

const DEFAULT_RESPONSES = {
    401: {
        description: 'Unauthorized',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['FAILED'],
                        },
                        code: {
                            type: 'string',
                        },
                        message: {
                            type: 'string',
                        },
                    },
                },
            },
        },
    },
};

function clean(f: z.ZodTypeAny): void {
    if (f instanceof z.ZodObject) {
        const keys = Object.keys(f.shape);
        for (const key of keys) {
            let entry = f.shape[key];
            if (entry instanceof z.ZodOptional) {
                const inner = entry._def.innerType;
                if (inner instanceof z.ZodEffects) {
                    entry._def.innerType = inner.innerType();
                }
            }

            if (entry instanceof z.ZodEffects) {
                entry = entry.innerType();
            }

            // eslint-disable-next-line no-param-reassign
            f.shape[key] = entry;
        }
    }
}

type Parameter = {
    schema: { type: string } | { type: 'array', items: { type: string } },
    required: boolean,
    in: 'query',
    name: string,
    description: string,
};

function queryToParameters(query: z.ZodTypeAny | undefined) {
    const parameters: Parameter[] = [];
    if (!query) return parameters;

    if (query instanceof z.ZodObject) {
        for (const key of Object.keys(query.shape)) {
            let entry = query.shape[key];
            let optional = false;

            if (entry instanceof z.ZodOptional) {
                optional = true;
                entry = entry.unwrap();
            }
            if (entry instanceof z.ZodEffects) {
                entry = entry.innerType();
            }

            const pending: Parameter = {
                schema: {
                    type: 'number',
                },
                required: !optional,
                in: 'query',
                name: key,
                description: entry.description,
            };

            if (entry instanceof z.ZodNumber) {
                pending.schema.type = 'number';
                parameters.push(pending);
            } else if (entry instanceof z.ZodString) {
                pending.schema.type = 'string';
                parameters.push(pending);
            } else if (entry instanceof z.ZodBoolean) {
                pending.schema.type = 'boolean';
                parameters.push(pending);
            } else if (entry instanceof z.ZodArray) {
                let type: string;

                if (entry._def.type instanceof z.ZodString) {
                    type = 'string';
                } else if (entry._def.type instanceof z.ZodNumber) {
                    type = 'number';
                } else if (entry._def.type instanceof z.ZodBoolean) {
                    type = 'boolean';
                } else {
                    throw new Error('unknown type');
                }

                pending.schema = {
                    type: 'array',
                    items: {
                        type,
                    },
                };
            } else {
                console.error(entry._def);
                throw new Error(`Object type not yet supported: ${entry._def}`);
            }
        }
    }
    return parameters;
}

function endpointToPath<T extends Attachment>(target: T, key: keyof T) {
    const endpoint: EndpointInfo = Reflect.getMetadata(key, target)[ENDPOINT_SYMBOL];
    if (endpoint.query) queryToParameters(endpoint.query);

    const newRoute = endpoint.simpleRoute.split('/')
        .map((e) => {
            if (e.startsWith(':')) return `{${e.substring(1)}}`;
            return e;
        })
        .join('/');

    const routeName = newRoute.split('/')
        .map((e) => e.replace('{', '')
            .replace('}', ''))
        .map((e) => `${e.substring(0, 1)
            .toUpperCase()}${e.substring(1)
            .toLowerCase()}`)
        .join('');

    const bodyName = `${methodToString(endpoint.method)
        .toUpperCase()}${routeName}Body`;

    let okResult = {};
    if (endpoint.reply.length === 3) {
        okResult = { $ref: `#/components/schemas/${endpoint.reply[0]}` };
    } else {
        okResult = {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['OK'],
                },
                result: {
                    $ref: `#/components/schemas/${endpoint.reply[0]}`,
                },
            },
        };
    }

    return {
        [newRoute]: {
            [methodToString(endpoint.method).trim().toLowerCase()]: {
                ...(getDescription(target, key) ?? {}),
                tags: getTags(target, key),
                ...(endpoint.body ? {
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: `#/components/schemas/${bodyName}`,
                                },
                            },
                        },
                    },
                } : {}),
                parameters: [
                    ...((endpoint.route.filter((e) => typeof (e) === 'object') as { key: string, description: string }[]
                    ).map((e) => ({
                        in: 'path',
                        name: e.key,
                        description: e.description,
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    }))),
                    ...queryToParameters(endpoint.query),
                ],
                responses: {
                    ...DEFAULT_RESPONSES,
                    200: {
                        description: 'The request was successful',
                        content: {
                            'application/json': {
                                schema: okResult,
                            },
                        },
                    },
                },
            },
        },
    };
}

function flatten(result: Record<string, Record<string, any>>[]) {
    const output: Record<string, Record<string, any>> = {};

    for (const entry of result) {
        for (const route of Object.keys(entry)) {
            if (!has(output, route)) output[route] = {};
            output[route] = {
                ...output[route],
                ...entry[route],
            };
        }
    }

    return output;
}

const registry = new OpenAPIRegistry();
const registered: string[] = [];
// @ts-ignore
const INSTANCES = ROUTES.map((V) => new V(undefined as any, undefined as any, undefined as any));

const outputRoutes: string[][] = [];
INSTANCES.map(getAPIEndpoints)
    .flat()
    .forEach((endpoint) => {
        const summary = `${bold`${methodSymbol[endpoint.method]}  ${methodToString(endpoint.method)
            .toUpperCase()}`} ${endpoint.simpleRoute} ${italic`=>  ${endpoint.reply[0]}`}`;

        outputRoutes.push([
            `${methodSymbol[endpoint.method]}  ${methodToString(endpoint.method)}`,
            endpoint.simpleRoute,
            endpoint.reply[0],
            endpoint.warning ?? '',
        ]);
        console.log(summary);

        if (!registered.includes(endpoint.reply[0])) {
            registry.register(endpoint.reply[0], endpoint.reply[1]);
            registered.push(endpoint.reply[0]);
        } else {
            console.log(italic`   Warning: equal name found, manually verify that these types match!`);
        }

        if (endpoint.roles) {
            console.log(bold`  Authorization Required: ✔`);
            console.log(italic`    Roles required: ${endpoint.roles.join(', ')}`);
        } else {
            console.log(bold`  Authorization Required: ❌`);
        }

        const newRoute = endpoint.simpleRoute.split('/')
            .map((e) => {
                if (e.startsWith(':')) return `{${e.substring(1)}}`;
                return e;
            })
            .join('/');

        const routeName = newRoute.split('/')
            .map((e) => e.replace('{', '')
                .replace('}', ''))
            .map((e) => `${e.substring(0, 1)
                .toUpperCase()}${e.substring(1)
                .toLowerCase()}`)
            .join('');

        if (endpoint.body) {
            const bodyName = `${methodToString(endpoint.method)
                .toUpperCase()}${routeName}Body`;
            console.log(bold`  Body Validated: ✔️`);
            console.log(italic`    Required schema: #${bodyName}`);
            if (!registered.includes(bodyName)) {
                registered.push(bodyName);
                registry.register(bodyName, endpoint.body);
                console.log(italic`    + ${bodyName}`);
            } else {
                console.log(italic`    Warning: equal name found, manually verify that these types match!`);
            }
        } else {
            console.log(bold`  Body Validated: ❌`);
        }

        console.log('');
    });

const pad = (s: string, l: number) => `${s}${' '.repeat(Math.max(0, l - s.length))}`;
const maxRoute = Math.max(...outputRoutes.map((e) => e[1].length));
const format = (s: string) => s.split('/')
    .map((e) => e.startsWith(':') ? bold`${e}` : e)
    .join('/');

const outputRoutesMaxLength = Math.max(...outputRoutes.map((_, s) => String(s).length));
const indexPad = (s: number) => pad(String(s), outputRoutesMaxLength);

console.log(bold`-----------`);
console.log(bold`| Summary |`);
console.log(bold`-----------`);
console.log(outputRoutes.map(
    ([a, b, c, d], i) => `[${indexPad(i)}]: ${bold`${a}`} ${format(pad(b, maxRoute))}  =>  ${italic`${c}`}${d.length > 0 ? `\n\t${italic`${d}`}` : ''}`,
)
    .join('\n'));
console.log('');

const generator = new OpenAPIGenerator(registry.definitions);

const specification = {
    openapi: '3.0.0',
    info: {
        title: 'UEMS Gateway Interface',
        version: '2.0',
        description: 'The gateway of the UEMS platform, used by the frontend web API',
        contact: {
            name: 'Ryan Delaney',
            email: 'ryan.delaney@xiomi.org',
            url: 'https://xiomi.org',
        },
    },
    servers: [],
    paths: {
        ...(flatten(INSTANCES.map((e) => Reflect.getMetadataKeys(e)
            .map((v) => endpointToPath(e, v))
            .flat())
            .flat())),
    },
    ...generator.generateComponents(),
    tags: INSTANCES.map((e) => Reflect.getMetadataKeys(e)
        .map((v) => getTags(e, v))
        .flat())
        .flat()
        .filter((e, i, a) => a.indexOf(e) === i)
        .map((e) => ({ name: e })),
};

fs.writeFileSync('.spec/uems.openapi.json', JSON.stringify(specification, null, 4), { encoding: 'utf8' });
console.log('>> Updated schema has been written to uems.openapi.json');
