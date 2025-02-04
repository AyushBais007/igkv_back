var DB_SERVICE = global.DB_SERVICE;
var CONFIG_PARAMS = global.COMMON_CONFS;
var securityService = require('./securityservice.js');
var MASTER_QUERIES = require('../queries/masterQueries.js');
var async = require('async');
const { validateAndInsertInTable, getQueryFromID,getQueryDataFromId } = require('./commonService.js')

let test = {
    getMenuByUser: function (dbkey, request, params, sessionDetails, callback) {
        if (!params.emp_id) return callback(securityService.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING);
        let menu = {};
        let qAndpObj = MASTER_QUERIES.getMenuByUserQueryParamObj(params.emp_id);
        DB_SERVICE.executeQueryWithParameters(dbkey, qAndpObj.query, qAndpObj.params, function (e1, r1) {
            if (e1) {
                return callback(e1)
            }
            else if (r1.data && r1.data.length > 0) {
                menu = convertToModuleFormat(r1.data)
                callback(null, menu);

            } else {
                callback(null, []);
            }
        })
    },

    getPostDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.query_id = 5
       return getQueryDataFromId(dbkey, request, params, sessionDetails, callback)
    },
    getPageDetails :function (dbkey, request, params, sessionDetails, callback) {
        params.query_id = 4
       return getQueryDataFromId(dbkey, request, params, sessionDetails, callback)
    },
    getApiDetails :function (dbkey, request, params, sessionDetails, callback) {
        params.query_id = 6
       return getQueryDataFromId(dbkey, request, params, sessionDetails, callback)
    },
    saveComponentDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'mas_component'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },

    saveApiDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'mas_api'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    saveQueryDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'mas_custom_queries'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    mapPostApiDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'map_post_api'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    mapModuleComponentDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'map_module_component'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    getModuleDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.query_id = 3
        return getQueryDataFromId(dbkey, request, params, sessionDetails, callback)
    },
    saveApiWithpermission: function (dbkey, request, params, sessionDetails, callback) {
        let tranObj, tranCallback;
        async.series([
            //createTransaction
            function (cback) {
                DB_SERVICE.createTransaction(dbkey, function (err, tranobj, trancallback) {
                    tranObj = tranobj;
                    tranCallback = trancallback;
                    dbkey = { dbkey: dbkey, connectionobj: tranObj };
                    return cback(err);
                })
            },
            // insert in mas_api
            function (cback1) {
                test.saveApiDetails(dbkey, request, params, sessionDetails, function (err, res) {
                    if (err) return cback1(err);
                    params.api_id = res.data['insertId']
                    return cback1();
                })
            },
            //insert into map_post_api
            function (cback2) {
                test.mapPostApiDetails(dbkey, request, params, sessionDetails, function (err, res) {
                    if (err) return cback2(err);
                    return cback2();

                })
            }
        ], function (err, res) {
            if (err) {
                DB_SERVICE.rollbackPartialTransaction(tranObj, tranCallback, function (err4) {
                    return callback(err);
                })
            }
            else {
                console.log('test completed')
                DB_SERVICE.commitPartialTransaction(tranObj, tranCallback, function (err5) {
                     return callback(null, { ...securityService.SECURITY_ERRORS.SUCCESS, message: 'insert sucsessfully' })
                });
            }
        })

    },
    saveModuleDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'master_module'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    savepageDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'master_page'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
    mapModulePageDetails: function (dbkey, request, params, sessionDetails, callback) {
        params.table_name = 'map_module_page'
        return validateAndInsertInTable(dbkey, request, params, sessionDetails, callback)
    },
}

module.exports = test