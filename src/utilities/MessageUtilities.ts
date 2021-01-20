import { Request, Response } from "express";
import { constants } from "http2";

export namespace MessageUtilities {

    /**
     * Stores identifiers currently being used by active messages
     * @private
     */
    const inUseIdentifiers: number[] = [];

    /**
     * Generates an ID and stores it in the in use identifiers. It will continually generate IDs until one is found
     * which is free. If it fails to generate one within 50 loops it will raise en error. The ID range is in the range
     * 0 - 100000 so if 50 IDs cannot be generated, it indicated something is very wrong with the ID generation system.
     */
    export function generateMessageIdentifier() {
        let id;
        let generations = 0;
        while (id === undefined || inUseIdentifiers.includes(id)) {
            id = Math.round(Math.random() * 100000);

            generations += 1;
            if (generations > 50) {
                throw new Error('Unable to generate a message ID after 50 generations. Too many messages at once?');
            }
        }

        inUseIdentifiers.push(id);

        return id;
    }

    /**
     * Marks an ID be marked as consumed which will remove it from the in use identifiers. This must be called after
     * the ID is finished being used or {@link generateMessageIdentifier} will begin to fail.
     * @param identifier the identifier that was used
     */
    export function identifierConsumed(identifier: number) {
        const index = inUseIdentifiers.indexOf(identifier);
        if (index === -1) return;

        inUseIdentifiers.splice(index, 1);
    }

    /**
     * Returns if the object contains the given key while supporting undefined / null keys and values.
     * @param object the object in which to search
     * @param key the key to find within this object
     */
    export function has(object: any, key: string | number): boolean {
        if (object === undefined || object === null) return false;
        if (key === undefined || key === null) return false;
        try {
            return Object.prototype.hasOwnProperty.call(object, key);
        } catch (e) {
            return false;
        }
    }

    export function wrapInSuccess(result: any) {
        return {
            status: 'OK',
            result,
        };
    }

    export function wrapInFailure(error: { code: string, message: string }) {
        return {
            error,
            status: 'FAILED',
        };
    }

    function safeRunValidator(
        validator: (x: any) => boolean,
        entry: any,
        name: string,
        response: Response,
    ) {
        try {
            if (!validator(entry)) {
                response
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: `invalid parameter type for ${name}`,
                        code: 'BAD_REQUEST_INVALID_PARAM',
                    }));
                return false;
            }
        } catch (e) {
            response
                .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
                .json(MessageUtilities.wrapInFailure({
                    message: `could not parse parameter ${name}`,
                    code: 'BAD_REQUEST_INVALID_PARAM',
                }));
            return false;
        }
        return true;
    }

    export function verifyData<P extends string[]>(
        data: Record<string, any>,
        response: Response,
        required: P,
        types?: Record<string, (x: any) => boolean>,
    ) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key of required) {
            if (!MessageUtilities.has(data, key)) {
                response
                    .status(constants.HTTP_STATUS_BAD_REQUEST)
                    .json(MessageUtilities.wrapInFailure({
                        message: `missing parameter ${key}`,
                        code: 'BAD_REQUEST_MISSING_PARAM',
                    }));
                return false;
            }
        }

        if (types !== undefined) {
            // eslint-disable-next-line no-restricted-syntax
            for (const key of Object.keys(types)) {
                if (!types[key](data[key])) {
                    response
                        .status(constants.HTTP_STATUS_BAD_REQUEST)
                        .json(MessageUtilities.wrapInFailure({
                            message: `invalid parameter type for ${key}`,
                            code: 'BAD_REQUEST_INVALID_PARAM',
                        }));
                    return false;
                }
            }
        }

        return true;
    }

    export function verifyBody<P extends string[]>(
        request: Request,
        response: Response,
        required: P,
        types?: Record<string, (x: any) => boolean>,
    ) {
        return verifyData(
            request.body,
            response,
            required,
            types,
        );
    }

    export function verifyQuery<P extends string[]>(
        request: Request,
        response: Response,
        required: P,
        types?: Record<string, (x: any) => boolean>,
    ) {
        return verifyData(
            request.query,
            response,
            required,
            types,
        );
    }

    export function coerceAndVerifyQuery<P extends string[]>(
        request: Request,
        response: Response,
        required: P,
        types?: Record<string, { primitive: 'string' | 'number' | 'boolean', validator?: (x: any) => boolean }>,
    ) {
        // First step, validate missing keys
        if (!verifyData(request.query, response, required)) return false;

        if (types) {
            // Then we want to try and perform coercion on the data
            for (const [name, type] of Object.entries(types)) {
                const {
                    primitive,
                    validator,
                } = type;

                // By default everything is a string. So we only care about strings if it has a validator
                if (primitive === 'string') {
                    if (validator) {
                        if (!safeRunValidator(validator, request.query[name], name, response)) {
                            return false;
                        }
                    }
                } else if (primitive === 'number') {
                    // First check if this can be parsed, by trying to parse it as a number
                    const cast = Number(request.query[name]);
                    if (Number.isNaN(cast)) {
                        response
                            .status(constants.HTTP_STATUS_BAD_REQUEST)
                            .json(MessageUtilities.wrapInFailure({
                                message: `invalid parameter type for ${name}, expected number`,
                                code: 'BAD_REQUEST_INVALID_PARAM',
                            }));
                        return false;
                    }

                    // Once this has been cast we want to update the query with the new parameter
                    // @ts-ignore - while not technically valid, this will work for what we need
                    request.query[name] = cast;

                    // Then we want to run any additional validators on it
                    if (validator) {
                        if (!safeRunValidator(validator, request.query[name], name, response)) {
                            return false;
                        }
                    }
                } else if (primitive === 'boolean') {
                    const value = request.query[name];
                    if (value === undefined) {
                        // Shouldn't happen
                        response
                            .status(constants.HTTP_STATUS_BAD_REQUEST)
                            .json(MessageUtilities.wrapInFailure({
                                message: `missing parameter ${name}`,
                                code: 'BAD_REQUEST_MISSING_PARAM',
                            }));
                        return false;
                    }

                    if (value.toString()
                        .toLowerCase() !== 'true' && value.toString()
                        .toLowerCase() !== 'false') {
                        response
                            .status(constants.HTTP_STATUS_BAD_REQUEST)
                            .json(MessageUtilities.wrapInFailure({
                                message: `invalid parameter type for ${name}, expected boolean (true or false)`,
                                code: 'BAD_REQUEST_INVALID_PARAM',
                            }));
                        return false;
                    }

                    // Once this has been cast we want to update the query with the new parameter
                    // @ts-ignore - while not technically valid, this will work for what we need
                    request.query[name] = value === 'true';

                    // Then we want to run any additional validators on it
                    if (validator) {
                        if (!safeRunValidator(validator, request.query[name], name, response)) {
                            return false;
                        }
                    }
                }

            }

        }

        return true;
    }

}
