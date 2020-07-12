/*
    Handles internal message validation as per the schema.

    Abstracts over Ajv to allow additional checks being added when performing message checks.
*/

import Ajv from 'ajv';

export class MessageValidator {
    schema_validator: Ajv.ValidateFunction;

    constructor(schema: object) {
        const ajv = new Ajv({ allErrors: true });
        this.schema_validator = ajv.compile(schema);
    }

    public async validate(msg: any): Promise<boolean> {
        return this.schema_validator(msg);
    }
}

module.exports = MessageValidator;
