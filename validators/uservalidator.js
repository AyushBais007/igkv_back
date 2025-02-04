var joi = require('joi');

let validators = {

    validateSchema: function (schema, reqBody) {
        return schema.validate(reqBody);
    },

    deleteOprationObjectValidation: function (reqBody) {
        let schema = joi.object({
            "log_table_name": joi.string().required(),
            "delete_table_name": joi.string().required(),
            "whereObj": joi.object().min(1).required()
        }).unknown(true);
        return schema.validate(reqBody, { allowUnknown: true });
    },

    updateOprationObjectValidation: function (reqBody) {
        let schema = joi.object({
            "log_table_name": joi.string().required(),
            "update_table_name": joi.string().required(),
            "whereObj": joi.object().min(1).required(),
            "updateObj": joi.object().min(1).required(),
            "update_type": joi.number().required()
        }).unknown(true);
        return schema.validate(reqBody, { allowUnknown: true });
    },

    insertComponentObjectValidation: function (reqBody) {
        let schema = joi.object({
            "c_name": joi.string().required(),
            "c_description": joi.string().required(),
            "user_id": joi.number().required(),
            "ip_address": joi.string().required()
        }).options({ stripUnknown: true });
        return schema.validate(reqBody, { allowUnknown: true });
    }
}

function generateJoiValidator(queryResult) {
    const schema = {};

    queryResult.forEach(column => {
        const columnName = column.COLUMN_NAME;
        const dataType = column.DATA_TYPE.toLowerCase();
        const isNullable = column.IS_NULLABLE === 'YES';
        const columnDefault = column.COLUMN_DEFAULT === 'NULL' ? null :column.COLUMN_DEFAULT;
        let joiValidator = null;

        // Handle data types and create corresponding Joi validators
        switch (dataType) {
            case 'varchar':
            case 'char':
            case 'text':
            case 'string':
                joiValidator = joi.string();
                break;
            case 'int':
            case 'tinyint':
            case 'smallint':
            case 'mediumint':
            case 'bigint':
                joiValidator = joi.number().integer();
                break;
            case 'decimal':
            case 'float':
            case 'double':
                joiValidator = joi.number();
                break;
            case 'date':
            case 'datetime':
            case 'timestamp':
                joiValidator = joi.date();
                if (columnDefault === 'current_timestamp()') {
                    joiValidator = joiValidator.default(() => new Date());
                }
                break;
            case 'boolean':
            case 'bool':
                joiValidator = joi.boolean();
                break;
            default:
                joiValidator = joi.any();  // Catch-all for any unhandled data types
        }
        // If there is a default value, add the `default()` option
        if (columnDefault && columnDefault !== 'current_timestamp()') {
            joiValidator = joiValidator.default(columnDefault);
        }
        // If the column is not nullable, make it required
        if (!isNullable) {
            if (!columnDefault) {
                // If no default value is provided, make it required
                joiValidator = joiValidator.required();
            }
        } else {
            // If nullable, allow null
            joiValidator = joiValidator.allow(
                

            );
        }
        // Add the column validator to the schema
        schema[columnName] = joiValidator;
    });

    // Return the schema object with allowUnknown set to true
    return joi.object(schema).options({ stripUnknown: true });
}




module.exports = validators
module.exports.generateJoiValidator = generateJoiValidator;