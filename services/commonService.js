var DB_SERVICE = global.DB_SERVICE;
const SECURITY_SERVICE = require('./securityservice.js');
var COMMON_QUERIES = require('../queries/commonQueries.js');
var async = require('async');
var CONFIG_PARAMS = global.COMMON_CONFS;
const config = require('config');
var { generateJoiValidator, validateSchema } = require("../validators/uservalidator.js");
const { updateOprationObjectValidation, deleteOprationObjectValidation } = require("../validators/uservalidator.js")

var common = {
    //insert in app log then delete from table
    insrtAndDltOperation: function (dbkey, request, params, sessionDetails, callback) {
        const { value, error } = deleteOprationObjectValidation(params);
        if (error) {
            return callback(`in delete opration object :- ${error.details[0].message}`);
        }
        if (params.delete_table_name == 'farmer_society') {
            return callback(`in delete opration object :- trying to delete record from farmer society.`);
        }
        let { log_table_name, delete_table_name, whereObj } = value
        let found_rows = [], qAndParam = {};
        async.series([
            //get data
            function (cback1) {
                let query = `select * from ${delete_table_name}`, param = [];
                query = query + " where ";
                let count = 1;
                for (let key in whereObj) {
                    if (count != 1) {
                        query = query + " and ";
                    }
                    query = query + key + "=? ";
                    if (!whereObj[key]) {
                        return callback({ message: `in insrtAndDltOperation where obj key ${key} is undefined for update ${delete_table_name}.` });
                    }
                    param.push(whereObj[key]);
                    count++;
                }
                DB_SERVICE.executeQueryWithParameters(dbkey, query, param, function (e1, r1) {
                    if (e1) {
                        return cback1(e1);
                    }
                    else {
                        found_rows = r1.data;
                        return cback1(null);
                    }
                })
            },
            //insert into log table
            function (cback2) {
                async.eachSeries(found_rows, function (row, cb1) {
                    async.series([
                        function (cback1) {
                            if (delete_table_name == 'land_details') {
                                qAndParam = DB_SERVICE.getDeleteQueryAndparams({ id_masterkey_khasra: row.id_masterkey_khasra }, 'land_details_extra');
                                DB_SERVICE.executeQueryWithParameters(dbkey, qAndParam.query, qAndParam.params, function (e1, r1) {
                                    if (e1) {
                                        return cback1(e1);
                                    }
                                    else if (r1.data["affectedRows"] == 1) {
                                        return cback1();
                                    }
                                    else {
                                        return cback1({ "message": `in land_details_extra delete no row found for id_masterkey_khasra ${id_masterkey_khasra}` });
                                    }
                                })
                            } else {
                                return cback1();
                            }

                        },
                        function (cback2) {
                            row["action_ip_address"] = sessionDetails["ip_address"];
                            row['action_user_id'] = sessionDetails["user_id"];
                            row['action'] = 'D';
                            qAndParam = DB_SERVICE.getInsertClauseWithParams(row, log_table_name);
                            DB_SERVICE.executeQueryWithParameters(dbkey, qAndParam.query, qAndParam.params, function (err, res) {
                                if (err) {
                                    return cback2(err);
                                }
                                else if (res.data["affectedRows"] == 1) {
                                    return cback2()
                                }
                                else {
                                    return cback2({ "message": `Insert into ${log_table_name} is failed.` })
                                }
                            })
                        }
                    ], function (err, res) {
                        return cb1(err);
                    })

                }, function (err, res) {
                    if (err) {
                        return cback2(err)
                    }
                    else {
                        return cback2()
                    }
                })
            },
            //delete from table   
            function (cback3) {
                qAndParam = DB_SERVICE.getDeleteQueryAndparams(whereObj, delete_table_name);
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndParam.query, qAndParam.params, function (e1, r1) {
                    if (e1) {
                        return cback3(e1);
                    }
                    else if (found_rows.length == r1.data["affectedRows"]) {
                        return cback3();
                    }
                    else {
                        return cback3({ "message": `in delete, ${delete_table_name} found data length ${found_rows.length} and Deleted data length ${r1.data["affectedRows"]} is not Matched` });
                    }
                })
            },
        ], function (err, res) {
            if (err) {
                return callback(err);
            }
            else {
                return callback(null, res);
            }
        })
    },
    //insert in app log then update from table
    insrtAndUpdtOperation: function (dbkey, request, params, sessionDetails, callback) {
        const { value, error } = updateOprationObjectValidation(params);
        if (error) {
            return callback(`in update opration object :- ${error.details[0].message}`);
        }
        let { log_table_name, update_table_name, whereObj, update_type, updateObj } = value
        let found_rows = [], qAndParam = {};
        async.series([
            //get data
            function (cback1) {
                let query = `select * from ${update_table_name}`, param = [];
                query = query + " where ";
                let count = 1;
                for (let key in whereObj) {
                    if (count != 1) {
                        query = query + " and ";
                    }
                    query = query + key + "=? ";
                    if (!whereObj[key]) {
                        return callback({ message: `in insrtAndUpdtOperation where obj key ${key} is undefined for update ${update_table_name}.` });
                    }
                    param.push(whereObj[key]);
                    count++;
                }
                DB_SERVICE.executeQueryWithParameters(dbkey, query, param, function (e1, r1) {
                    if (e1) {
                        return cback1(e1);
                    }
                    else if (r1 && r1.data) {
                        found_rows = r1.data;
                        return cback1(null);
                    }
                })
            },
            //insert into log table
            function (cback2) {
                async.eachSeries(found_rows, function (row, cb1) {
                    row["action_ip_address"] = sessionDetails["ip_address"];
                    row['action_user_id'] = sessionDetails["user_id"];
                    row['action'] = 'U';
                    if (log_table_name == 'app_log_farmer_society') {
                        row['sanshodhan_type'] = update_type;
                    }
                    qAndParam = DB_SERVICE.getInsertClauseWithParams(row, log_table_name);
                    DB_SERVICE.executeQueryWithParameters(dbkey, qAndParam.query, qAndParam.params, function (err, res) {
                        if (err) {
                            return cb1(err);
                        }
                        else if (res.data["affectedRows"] == 1) {
                            return cb1()
                        }
                        else {
                            return cb1({ "message": `Insert into ${log_table_name} is failed.` })
                        }
                    })
                }, function (err, res) {
                    if (err) {
                        return cback2(err)
                    }
                    else {
                        return cback2()
                    }
                })
            },
            //update table   
            function (cback3) {
                qAndParam = DB_SERVICE.getUpdateQueryAndparams(updateObj, whereObj, update_table_name);
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndParam.query, qAndParam.params, function (e1, r1) {
                    if (e1) {
                        return cback3(e1);
                    }
                    else if (found_rows.length == r1.data["affectedRows"]) {
                        return cback3();
                    }
                    else {
                        return cback3({ "message": `in update, ${update_table_name} found data length ${found_rows.length} and updated data length ${r1.data["affectedRows"]} is not Matched` });
                    }
                })
            },
        ], function (err, res) {
            if (err) {
                return callback(err);
            }
            else {
                return callback(null, found_rows);
            }
        })
    },

    getAllowedJsonFromPageId: function (dbkey, request, params, sessionDetails, callback) {
        if (!(params.page_id && sessionDetails.user_id)) return callback(`in getAllowedJsonFromPageId page_id and user_id is_required`);
        let access_obj = {}
        let qAndpObj = COMMON_QUERIES.getAllowedJsonFromPageIdQueryParamObj(sessionDetails.user_id, params.page_id);
        DB_SERVICE.executeQueryWithParameters(dbkey, qAndpObj.query, qAndpObj.params, (e1, r1) => {
            if (e1) {
                return callback(e1);
            } else if (r1.data.length == 1) {
                access_obj = r1.data[0]
                if (access_obj.roll_id == 1) return callback(null, { access_json: {} })
                return callback(null, { access_json: JSON.parse(access_obj['access_json']) })
            } else {
                return callback({ message: `no or multiple record found in page_access_control for page_id ${params.page_id} and user_id ${sessionDetails['user_id']}` })
            }

        })
    },
    getFilterValueFromAllowedJson: function (dbkey, request, params, sessionDetails, callback) {
        if (!(params.all_records && params.filter_column && params.page_id)) return callback(`in getFilterValueFromAllowedJson all_records,page_id and filter_column is_required`);
        let access_json = {}, filter_records = [];
        let { filter_column = '', all_records } = params;
        async.series([
            // get data from allowed json
            function (cback1) {
                common.getAllowedJsonFromPageId(dbkey, request, params, sessionDetails, function (err, res) {
                    if (err) {
                        return cback1(err);
                    } else if (res.hasOwnProperty('access_json')) {
                        access_json = res['access_json']
                        return cback1()
                    } else {
                        return cback1({ message: `access_json not received from getAllowedJsonFromPageId function.` })
                    }
                })
            },
            // get filter value
            function (cback2) {
                if (access_json && access_json.constructor === Object && Object.keys(access_json).length === 0) {
                    filter_records = all_records;
                    return cback2();
                }
                if (access_json && access_json[filter_column]) {
                    filter_records = access_json[filter_column] == -1 ? all_records : all_records.filter(function (e) {
                        return access_json[filter_column].includes(e[filter_column])
                    })
                } else {
                    filter_records = []
                }
                return cback2();
            }

        ], function (err, res) {
            if (err) {
                return callback(err);
            } else {
                return callback(null, { filter_records, all_records })
            }
        })

    },
    getQueryFromID_old: function (dbkey, params, callback) {
        let validParam = true;
        let p = [], err_obj = {};
        if (!(params.query_id && typeof params.query_id == "number")) {
            return callback({ ...SECURITY_SERVICE.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING, message: `query id is required and its type must be string.` });
        }
        const { access_type = "S" } = params;
        console.log(access_type);

        let table_name = access_type == 'C' ? 'mas_custom_queries' : 'mas_queries'
        let query = `SELECT * FROM ${table_name} mq WHERE mq.query_id = ${params.query_id}`
        DB_SERVICE.executeQueryWithParameters(dbkey, query, [], (e1, r1) => {
            if (e1) {
                return callback(e1);
            } else if (r1.data && r1.data.length == 1) {
                let qAnpPObj = r1.data[0];
                q = r1.data[0].query;
                if (!qAnpPObj.params) return callback(null, { query: r1.data[0].query, params: [] });
                const paramsRequired = JSON.parse(qAnpPObj.params);
                const paramsKeyArr = Object.keys(paramsRequired);
                for (let i = 0; i < paramsKeyArr.length; i++) {
                    let key = paramsKeyArr[i];
                    if (key in params) {
                        if (typeof params[key] == paramsRequired[key]) {
                            p.push(params[key]);
                        }
                        else {
                            validParam = false;
                            err_obj = { message: `typeof ${params[key]} ${typeof params[key]} is not equal to ${paramsRequired[key]}` }
                            break;
                        }
                    }
                    else {
                        err_obj = { message: `key ${key} not exists in given data.` }
                        validParam = false;
                        break;
                    }
                }
                if (validParam) {
                    return callback(null, { query: r1.data[0].query, params: p });
                }
                else {
                    return callback(err_obj);
                }
            } else {
                return callback({ message: `no or multiple record found in mas_queries for query_name ${params.query_name}}` })
            }

        })
    },
    getQueryFromID: function (dbkey, params, callback) {
        let validParam = true;
        let p = [], err_obj = {};
        if (!(params.query_id && typeof params.query_id == "number")) {
            return callback({ ...SECURITY_SERVICE.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING, message: `query id is required and its type must be number.` });
        }
        const { access_type = "S" } = params;
        let table_name = 'mas_custom_queries'
        let query = `SELECT * FROM ${table_name} mq WHERE mq.query_id = ${params.query_id}`
        DB_SERVICE.executeQueryWithParameters(dbkey, query, [], (e1, r1) => {
            if (e1) {
                return callback(e1);
            } else if (r1.data && r1.data.length == 1) {
                // console.log(r1.data[0]);
                let all_query_details = JSON.parse(r1.data[0]['query_object'])
                if (!all_query_details[access_type]) return callback({ message: `no  record found in mas_queries for access_type ${access_type} query_name ${params.query_name}}` })
                let qAnpPObj = all_query_details[access_type];
                if (!(qAnpPObj.params || qAnpPObj.params == {})) return callback(null, { query: qAnpPObj.query, params: [] });
                const paramsRequired = qAnpPObj.params
                const paramsKeyArr = Object.keys(paramsRequired);
                for (let i = 0; i < paramsKeyArr.length; i++) {
                    let key = paramsKeyArr[i];
                    if (key in params) {
                        if (typeof params[key] == paramsRequired[key]) {
                            p.push(params[key]);
                        }
                        else {
                            validParam = false;
                            err_obj = { message: `typeof ${params[key]} ${typeof params[key]} is not equal to ${paramsRequired[key]}` }
                            break;
                        }
                    }
                    else {
                        err_obj = { message: `key ${key} not exists in given data.` }
                        validParam = false;
                        break;
                    }
                }
                if (validParam) {
                    return callback(null, { query: qAnpPObj.query, params: p });
                }
                else {
                    return callback(err_obj);
                }
            } else {
                return callback({ message: `no or multiple record found in mas_queries for query_name ${params.query_name}}` })
            }

        })
    },
    generateJoiValidatorFromTable: function (params, callback) {
        let { database_name = config.get('common_db.database'),
            table_name } = params
        let query = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                            FROM INFORMATION_SCHEMA.COLUMNS
                            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                            AND EXTRA <>'auto_increment';`
        DB_SERVICE.executeQueryWithParameters(CONFIG_PARAMS.getWorkingDBDetails(), query, [database_name, table_name], function (e1, r1) {
            if (e1) {
                return cback1(e1);
            }
            else if (r1.data && r1.data.length > 0) {
                let meta_details = [...r1.data]
                // console.log(meta_details);
                return callback(null, { schema: generateJoiValidator(meta_details) });
            } else {
                return callback({ measge: `no data found for database_name ${database_name} and  TABLE_NAME ${table_name}` })
            }
        })
    },
    validateAndInsertInTable: function (dbkey, request, params, sessionDetails, callback) {
        if (!(params.table_name)) {
            return callback({ ...SECURITY_SERVICE.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING, message: `table_name is required in validateAndInsertInTable function.` });
        }
        const { table_name } = params
        params.created_user_id = sessionDetails["emp_id"];
        params.created_ip_address = sessionDetails["ip_address"];
        common.generateJoiValidatorFromTable({ table_name }, function (err, res) {
            if (err) return callback(err);
            const { value, error } = validateSchema(res['schema'], params);
            if (error) return callback(error);
            let qAndP = DB_SERVICE.getInsertClauseWithParams(value, table_name);
            DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (e1, r1) {
                if (r1 && r1.data) {
                    return callback(null, { ...SECURITY_SERVICE.SECURITY_ERRORS.SUCCESS, message: 'insert sucsessfully', data: r1.data })
                } else {
                    return callback(e1);
                }
            })
        })
    },
    getQueryDataFromId: function (dbkey, request, params, sessionDetails, callback) {
        let queryObj = {}
        async.series([
            function (cback) {
                common.getQueryFromID(dbkey, { query_id: params.query_id, ...sessionDetails }, function (err, qAndP) {
                    if (err) return cback(err);
                    else {
                        queryObj = qAndP;
                        return cback();
                    }
                });
            },
            function (cback1) {
                DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (e1, r1) {
                    if (e1) {
                        return cback1(e1);
                    }
                    else if (r1 && r1.data) {
                        found_rows = r1.data;
                        return cback1(null);
                    }
                })
            }
        ], function (err, res) {
            if (err) {
                return callback(err)
            } else {
                return callback(null, {data:found_rows})
            }

        })
    },
}

module.exports = common

