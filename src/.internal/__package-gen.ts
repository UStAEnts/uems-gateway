import { ASANA_SYMBOL, DESCRIBE_SYMBOL, DescriptionData, ENDPOINT_SYMBOL, EndpointInfo, Method, methodToString, WARN_SYMBOL } from "../decorators/endpoint";
import { GatewayMk2 } from "../Gateway";
import routes from "../routes";
import { ObjectUtilities } from "@uems/uemscommlib";
import { z } from 'zod';
import { printNode, zodToTs } from "zod-to-ts";
import fs from "fs";
import { ESLint, Linter } from 'eslint';
import Attachment = GatewayMk2.Attachment;
import has = ObjectUtilities.has;
import path from "path";
import * as crypto from "crypto";

const PACKAGE_GEN_VERSION = '0.0.6';

if (process.argv.length !== 3) {
    console.error('Please provide an output file location');
    process.exit(1);
}
const OUTPUT_FILE = process.argv[2];
console.log('Writing to', OUTPUT_FILE);

type EnrichedMetadata = EndpointInfo & {
    warning?: string,
    asana?: string,
    description?: DescriptionData,
};

function getEnrichedMetadata<T extends Attachment>(target: T, method: string): EnrichedMetadata | undefined {
    const meta = Reflect.getMetadata(method, target);
    if (!meta) return undefined;
    if (!meta[ENDPOINT_SYMBOL]) return undefined;

    return {
        ...meta[ENDPOINT_SYMBOL],
        description: meta[DESCRIBE_SYMBOL],
        warning: meta[WARN_SYMBOL],
        asana: meta[ASANA_SYMBOL],
    };
}

const METADATA = routes.map((V) => {
    //@ts-ignore
    return new V(undefined as any, undefined as any, undefined as any)
})
    .map((e) =>
        Reflect.getMetadataKeys(e)
            .map((k) => {
                const meta = getEnrichedMetadata(e, k);
                if (meta === undefined) console.warn('No metadata for', k);
                return meta;
            }),
    )
    .flat()
    .filter((e) => e !== undefined) as EnrichedMetadata[];

console.log('Extracting metadata and enriching');
// Let's make a hierarchy!

const HIERARCHY = {};
METADATA.forEach((e) => {
    const route = e.route.map((e) => typeof (e) === 'string' ? e : `:${e.key}`);
    let active: any = HIERARCHY;
    while (route.length > 1) {
        if (!has(active, route[0])) active[route[0]] = [];
        active = active[route[0]];
        route.shift();
    }

    if (!has(active, route[0])) active[route[0]] = [];
    active[route[0]].push(e);
});

console.log(`Produced a hierarchy with ${Object.keys(HIERARCHY).length} width`);

type Parameter = {
    name: string,
    type: string,
}

type MethodData = {
    name: string,
    parameters: Parameter[],
    returnType: string,
    isRequest: EnrichedMetadata | false,
};

type ClassData = {
    name: string,
    methods: MethodData[],
    carryThroughData: string[],
};

function generateClasses(
    directory: ClassData[],
    returnTypeDirectory: Record<string, z.ZodTypeAny>,
    parameterTypeDirectory: Record<string, z.ZodTypeAny>,
    className: string,
    carryThrough: string[],
    tree: Record<string | number, EnrichedMetadata | Record<string | number, EnrichedMetadata>>,
) {
    const classEntry: ClassData = {
        name: className,
        methods: [],
        carryThroughData: carryThrough,
    }

    for (const key of Object.keys(tree)) {
        if (tree[key] === undefined) {
            console.warn(key, 'was undefined');
            return;
        }
        if (isNaN(Number(key))) {
            // string, needs a pointer function

            if (key.startsWith(':')) {
                const newName = `${className}${key.substring(1, 2)
                    .toUpperCase()}${key.substring(2)}`;
                classEntry.methods.push({
                    name: key.substring(1),
                    returnType: newName,
                    parameters: [{
                        name: 'parameter',
                        type: 'string'
                    }],
                    isRequest: false,
                });
                generateClasses(directory, returnTypeDirectory, parameterTypeDirectory, newName, [...carryThrough, key.substring(1)], tree[key] as any);
            } else {
                const newName = `${className}${key.substring(0, 1)
                    .toUpperCase()}${key.substring(1)}`;
                classEntry.methods.push({
                    name: key,
                    returnType: newName,
                    parameters: [],
                    isRequest: false,
                });
                generateClasses(directory, returnTypeDirectory, parameterTypeDirectory, newName, carryThrough, tree[key] as any);
            }

        } else {
            const entry: EnrichedMetadata = tree[key] as any;
            let params: Parameter[] = [];

            if (entry.query) {
                const method = methodToString(entry.method);
                params.push({
                    name: 'query',
                    type: `${className}${method.substring(0, 1)
                        .toUpperCase()}${method.substring(1)}Query`,
                });
                parameterTypeDirectory[`${className}${method.substring(0, 1)
                    .toUpperCase()}${method.substring(1)}Query`] = entry.query;
            }
            if (entry.body) {
                const newRoute = entry.simpleRoute.split('/')
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

                params.push({
                    name: 'body',
                    type: `${methodToString(entry.method)
                        .toUpperCase()}${routeName}Body`,
                });
                parameterTypeDirectory[`${methodToString(entry.method)
                    .toUpperCase()}${routeName}Body`] = entry.body;
            }

            switch (entry.method) {
                case Method.POST:
                    classEntry.methods.push({
                        name: 'post',
                        parameters: params,
                        returnType: `Promise<${entry.reply.length === 3 ? `${entry.reply[0]}` : `UEMSResponse<${entry.reply[0]}>`}>`,
                        isRequest: entry,
                    });
                    returnTypeDirectory[entry.reply[0]] = entry.reply[1];
                    break;
                case Method.GET:
                    classEntry.methods.push({
                        name: 'get',
                        parameters: params,
                        returnType: `Promise<${entry.reply.length === 3 ? `${entry.reply[0]}` : `UEMSResponse<${entry.reply[0]}>`}>`,
                        isRequest: entry,
                    });
                    returnTypeDirectory[entry.reply[0]] = entry.reply[1];
                    break;
                case Method.DELETE:
                    classEntry.methods.push({
                        name: 'delete',
                        parameters: params,
                        returnType: `Promise<${entry.reply.length === 3 ? `${entry.reply[0]}` : `UEMSResponse<${entry.reply[0]}>`}>`,
                        isRequest: entry,
                    });
                    returnTypeDirectory[entry.reply[0]] = entry.reply[1];
                    break;
                case Method.PATCH:
                    classEntry.methods.push({
                        name: 'patch',
                        parameters: params,
                        returnType: `Promise<${entry.reply.length === 3 ? `${entry.reply[0]}` : `UEMSResponse<${entry.reply[0]}>`}>`,
                        isRequest: entry,
                    });
                    returnTypeDirectory[entry.reply[0]] = entry.reply[1];
                    break;
                default:
                    console.warn('not compatible');
            }
        }
    }

    console.log(`  ✔ ${className}`)
    directory.push(classEntry);
}

const returnTypeDirectory: Record<string, z.ZodTypeAny> = {};
const parameterTypeDirectory: Record<string, z.ZodTypeAny> = {};
const directory: ClassData[] = [];

console.log('Generating classes: ');
generateClasses(directory, returnTypeDirectory, parameterTypeDirectory, 'API', [], HIERARCHY);

console.log('Generating version');
const serialised = JSON.stringify({
    returnTypeDirectory,
    parameterTypeDirectory,
    directory
});
const version = crypto.createHash('SHA256')
    .update(serialised + PACKAGE_GEN_VERSION)
    .digest('base64');

try {
    const header = fs.readFileSync(OUTPUT_FILE, { encoding: 'utf8' })
        .split('\n')[0].trim();
    if (header.startsWith('// [package-gen]: version=')) {
        console.log("There's an existing package-gen file - testing the version")

        if (header.substring(26) !== version) {
            console.log('The version has changed! Regenerating...');
        } else {
            console.log('The version matched - no implementation details have changed according to the metadata so there are no changes to make! Exiting without editing any files');
            process.exit(0);
        }
    } else {
        console.log("There is a file but it wasn't generated with package-gen! Exiting! Delete the file if you want it overwritten");
        process.exit(0);
    }
} catch (e) {
    console.log("Can't read the output file - regenerating!");
}

const newHeader = `// [package-gen]: version=${version}\n`

const records = Object.entries({ ...parameterTypeDirectory, ...returnTypeDirectory })
    .map(([name, zod]) => `export type ${name} = ${printNode(zodToTs(zod, name).node)};`)
    .join('\n\n');

function parameterToString(parameter: Parameter) {
    return `${parameter.name}: ${parameter.type}`;
}

function methodToSource(method: MethodData, carryThrough: string[]) {
    let generation = `${method.name} = (${method.parameters.map(parameterToString)
        .join(', ')}): ${method.returnType} => {`;

    // let generation = `public ${method.name}(${method.parameters.map(parameterToString)
    //     .join(', ')}): ${method.returnType} {`;
    if (method.isRequest) {
        generation = `/**
        * ${method.isRequest.description?.summary}
        * 
        * ${method.isRequest.description?.description}
        * ${method.isRequest.warning ? `@warn ${method.isRequest.warning}` : ''}
        */${generation}`
        const hasQuery = method.parameters.find((e) => e.name === 'query') !== undefined;
        const hasBody = method.parameters.find((e) => e.name === 'body') !== undefined;
        const callString = method.isRequest.route.map((e) => typeof (e) === 'string' ? e : `\${encodeURIComponent(this.${e.key})}`)
            .join('/');

        if (method.isRequest.method === Method.GET || method.isRequest.method === Method.DELETE) {
            generation += `
        return this._http.${methodToString(method.isRequest.method)}(\`/${callString}\`${hasQuery ? ', query' : ', undefined'});
        }`
        } else {
            generation += `
        return this._http.${methodToString(method.isRequest.method)}(\`/${callString}\`${hasQuery ? ', query' : ', undefined'}${hasBody ? ', body' : ', undefined'});
        }`
        }
    } else {
        generation += `\n\treturn new ${method.returnType}(this._http${carryThrough.length + method.parameters.length > 0 ? ', ' : ''}${[...carryThrough.map((e) => `this.${e}`), method.parameters.map((e) => e.name)].join(', ')});\n}`
    }
    return generation;
}

function classToString(entry: ClassData) {
    return `class ${entry.name} {
    constructor(${['_http', ...entry.carryThroughData].map((e) => `private ${e}: ${e === '_http' ? 'HttpClient' : 'string'}`)
        .join(', ')}){}
    ${entry.methods.map((e) => methodToSource(e, entry.carryThroughData))
        .join('\n\n')}
    }`
}

const header = `${newHeader}
/**
* This file was generated by __package-gen.ts in the gateway project! You should not be editing this file by hand as 
* the types and functions here are generated entirely from the source code of gateway. If there is a bug in the 
* implementation it means there is either a bug in the source of the server, in which case you should edit the 
* annotations in the project, or it means there is a bug in the source generation (probably more likely) in which case 
* you need to edit the generation file, currently at 'src/.internal/__package-gen.ts'. 
* 
* TL;DR - DON'T EDIT THIS FILE - edit either 'src/attachments/*' in gateway or 'src/.internal/__package-gen.ts' in 
* gateway
*/
/* eslint-disable */
import axios from 'axios';

const ROOT_URL = '/api';

export type UEMSResponse<T> = {
    status: 'OK' | 'PARTIAL',
    result: T,
} | {
    status: 'FAILED',
    error: string,
};

interface HttpClient{
    get(url: string, query: any): Promise<any>;
    post(url: string, query: any, body: any): Promise<any>;
    patch(url: string, query: any, body: any): Promise<any>;
    delete(url: string, query: any): Promise<any>;
}

class DefaultUemsHttpClient implements HttpClient {
    private readonly headers = { headers: { 'Content-Type': 'application/json', 'Accepts': 'application/json' } }
    get(url: string, query: any): Promise<any>{
        return axios.get(ROOT_URL + url, { params: query, ...this.headers }).then((d) => d.data);
    }
    post(url: string, query: any, body: any): Promise<any>{
        return axios.post(ROOT_URL + url, body, { params: query, ...this.headers }).then((d) => d.data);
    }
    patch(url: string, query: any, body: any): Promise<any>{
        return axios.patch(ROOT_URL + url, body, { params: query, ...this.headers }).then((d) => d.data);
    }
    delete(url: string, query: any): Promise<any>{
        return axios.delete(ROOT_URL + url, { params: query, ...this.headers }).then((d) => d.data);
    }
}

`
const footer = `

const apiInstance = new API(new DefaultUemsHttpClient());

export default apiInstance;
`

console.log('Generating code');

const source = header + records + '\n\n' + directory.map(classToString)
    .join('\n\n') + footer;

console.log('Linting');
// run lint & get output for fix
(async () => {
    const result = require('prettier')
        .format(source, {
            parser: 'typescript',
            tabWidth: 4
        });

    console.log('Writing to output');
    fs.writeFileSync(OUTPUT_FILE, result, { encoding: 'utf8' });

    console.log('All done, happy building!')
})();