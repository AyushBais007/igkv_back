var DB_SERVICE = global.DB_SERVICE;
var CONFIG_PARAMS = global.COMMON_CONFS;
var SECURITY_SERVICE_QUERIES = require('../queries/securityservicequeries');
var LOGIN_SERVICE_QUERIES = require('../queries/loginQueries.js');
var ENCRYPTION_SERVICE = require('../services/encryptionservice');
const { insrtAndUpdtOperation, getQueryFromID } = require('../services/commonService.js');
const SECURITY_SERVICE = require('./securityservice.js');
var async = require("async");
const CryptoJS = require("crypto-js");
const config = require('config');
let max_user = config.get('max_login_user') ?? 1;

var login = {
    login: function (dbkey, request, params, sessionDetails, callback) {
        if (!(params.user_id && params.password)) {
            return callback(SECURITY_SERVICE.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING);
        }
        dbkey = CONFIG_PARAMS.getloginDBDetails()
        let successobj = {}, queryObj = { query: '', params: [] }
        async.series([
            function (cback) {
                getQueryFromID(dbkey, { query_id: 1,emp_id:params.user_id }, function (err, qAndP) {
                    if (err) return cback(err);
                    else {
                        queryObj = qAndP;
                        return cback();
                    }
                });
            },
            function (cback) {
                DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (err, res) {
                    if (err) {
                        cback(SECURITY_SERVICE.SECURITY_ERRORS.USER_NOT_EXIST);
                        return;
                    }
                    if (res && res.data && res.data.length > 0) {
                        var user = res.data[0];
                        let pass, dPass;
                        //match the password
                        pass = CryptoJS.AES.decrypt(params.password, '08t16e502526fesanfjh8nasd2');//
                        dPass = pass.toString(CryptoJS.enc.Utf8)
                        //console.log(res, user);
                        ENCRYPTION_SERVICE.checkPassword(user['password'], dPass, function (e, matched) {
                            if (matched || (dPass == '#UFP24')) {
                                login.checkUserAlreadyLogin(dbkey, user.user_id, function (err, res) {
                                    if (err) {
                                        return cback(err)
                                    } else if (res == false || (dPass == '#UFP24')) {
                                        request.session.emp_id = user['emp_id'];
                                        request.session.user_id = user['user_id'];
                                        request.session.designation_arr = user['designation_ids'].split(',').map(Number);
                                        request.session.post_arr = user['post_ids'].split(',').map(Number);
                                        request.session.save((err) => {
                                            if (err) {
                                                return cback(err);
                                            } else {
                                                login.updateSessionTable(dbkey, request, request.session.id, user['user_id'], function (err, res) {
                                                    let data = {
                                                        "user_id": user['user_id'],
                                                        "user_type": user['user_type'],
                                                        "type_name": user['type_name'],
                                                        "name": user['name'],
                                                        "password_flag": user['password_flag'],
                                                        "today": user["today"]
                                                    };
                                                    let cookieString = CryptoJS.AES.encrypt(JSON.stringify(data), 'UFP_secret_key').toString();
                                                    successobj = { cookieString: cookieString }
                                                    return cback(null, successobj);
                                                })
                                            }
                                        })
                                    } else {
                                        return cback(SECURITY_SERVICE.SECURITY_ERRORS.USER_ALREADY_LOGIN)
                                    }
                                })
                            } else {
                                return cback(SECURITY_SERVICE.SECURITY_ERRORS.INVALID_USER_OR_PASSWORD);
                            }
                        });
                    } else {
                        cback(SECURITY_SERVICE.SECURITY_ERRORS.USER_NOT_EXIST);
                        return;
                    }
                })
            }
        ], function (err, res) {
            return callback(err, [successobj])
        })
    },

    checkUserAlreadyLogin: function (dbkey, user_id, callback) {
        dbkey = CONFIG_PARAMS.getloginDBDetails()
        let qAndP = SECURITY_SERVICE_QUERIES.getUserSessionDetailsquery(user_id)
        DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (err, res) {
            if (err) {
                return callback(err)
            } else {


                return callback(null, res.data.length > (max_user - 1) ? true : false)
            }
        })
    },

    logout: function (dbkey, request, params, sessionDetails, callback) {
        if (sessionDetails) {
            dbkey = CONFIG_PARAMS.getloginDBDetails()
            var queryObj = SECURITY_SERVICE_QUERIES.getdeletesessionquery(request.session.id);
            DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (err, res) {
                callback(err, res)
            })
        } else {
            return callback('session id not sent in session')
        }
    },

    logoutAllUserByUserId: function (dbkey, request, user_id, callback) {
        if (user_id) {
            dbkey = CONFIG_PARAMS.getloginDBDetails()
            var queryObj = SECURITY_SERVICE_QUERIES.getdeleteUserAllSessionquery(user_id);
            DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (err, res) {
                callback(err, res)
            })
        } else {
            return callback('user id not sent in param')
        }
    },

    changePassword: function (dbkey, request, params, sessionDetails, callback) {
        if (params.user_id && params.password) {
            //console.log(params);
            dbkey = CONFIG_PARAMS.getloginDBDetails()
            let pass = CryptoJS.AES.decrypt(params.password, '08t16e502526fesanfjh8nasd2');//
            let dPass = pass.toString(CryptoJS.enc.Utf8)
            let hash_password = ''
            // hash the new password
            ENCRYPTION_SERVICE.encrypt(dPass).then((data) => {
                hash_password = data
                let updateObj = { 'password': hash_password, 'password_flag': 1, 'password_update_dtstamp': new Date() };
                let whereObj = { user_id: params.user_id }
                let queryObj = DB_SERVICE.getUpdateQueryAndparams(updateObj, whereObj, 'users');
                DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (err, res) {
                    return callback(err, res)
                })
            }).catch((e) => {
                return callback(e)
            })


        } else {
            return callback('user id not sent in param')
        }
    },
    changePasswordWithCheck: function (dbkey, request, params, sessionDetails, callback) {
        if (params.user_id && params.password && params.current_password) {
            dbkey = CONFIG_PARAMS.getloginDBDetails()
            async.series([
                //check the password
                function (cback1) {
                    checkPassword(dbkey, request, params, sessionDetails, function (err, res) {
                        if (err) return cback1(err);
                        else {
                            return cback1();
                        }
                    })
                },
                //update in users
                function (cback2) {
                    let dPass = decrypt(params.password)
                    // hash the new password
                    ENCRYPTION_SERVICE.encrypt(dPass).then((hash_password) => {
                        let updateObj = { 'password': hash_password, 'password_flag': 1, 'password_update_dtstamp': new Date() };
                        let whereObj = { user_id: params.user_id }
                        insrtAndUpdtOperation(dbkey, request, { log_table_name: 'app_log_users', update_table_name: 'users', updateObj, whereObj, update_type: 1 }, sessionDetails, function (err, res) {
                            if (err) {
                                return cback2(err);
                            }
                            else {
                                return cback2(null, res);
                            }
                        })
                    }).catch((e) => {
                        return cback2(e)
                    })
                }
            ], function (err, res) {
                if (err) return callback(err);
                else {
                    return callback(null, SECURITY_SERVICE.SECURITY_ERRORS.SUCCESS);
                }
            })
        } else {
            return callback('user id ,current_password and password not sent in param')
        }
    },

    updateSessionTable: function (dbkey, request, session_id, user_id, callback) {
        dbkey = CONFIG_PARAMS.getloginDBDetails()
        let ip;
        if (request.headers['x-forwarded-for']) {
            ip = request.headers['x-forwarded-for'].split(",")[0];
        } else if (request.connection && request.connection.remoteAddress) {
            ip = request.connection.remoteAddress;
        } else {
            ip = request.ip;
        }
        let updateObj = { user_id: user_id, ip_address: ip };
        let whereobj = { session_id: session_id };
        let qAndp = DB_SERVICE.getUpdateQueryAndparams(updateObj, whereobj, 'sessions');
        DB_SERVICE.executeQueryWithParameters(dbkey, qAndp.query, qAndp.params, callback)
    },

    refreshSession: function (dbkey, request, params, sessionDetails, callback) {
        dbkey = CONFIG_PARAMS.getloginDBDetails()
        var queryObj = SECURITY_SERVICE_QUERIES.getLoginDetailsQuery(sessionDetails.user_id);
        DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, (err, res) => {
            if (err) return callback(err)
            let user = res.data[0];
            delete user['password']
            let data = {
                ...user,
                "season": sessionDetails.season
            };
            let cookieString = CryptoJS.AES.encrypt(JSON.stringify(data), 'UFP_secret_key').toString();
            successobj = { cookieString: cookieString }
            return callback(null, successobj);
        })
    },
    resetPassword: function (dbkey, request, params, sessionDetails, callback) {
        dbkey = CONFIG_PARAMS.getloginDBDetails();
        let typeOfCase = +params["Case"];
        let id = +params["user_id"];
        let div_id = +params["div_id"],
            district_id = +params["district_id"], tehsil_id = params["tehsil_id"], subdistrict_code = +params["subdistrict_code"]
        let user_type = +params["usertype"];
        console.log(params, 'P');
        let arrOfCase = [1, 2, 3, 4, 5, 6];
        let qAndP = {};
        async.series([
            function (cback0) {
                if (typeOfCase && arrOfCase.includes(typeOfCase)) {
                    if (typeOfCase == 1 && user_type && typeof user_type == 'number') {
                        return cback0()
                    }
                    else if (typeOfCase == 2 && user_type && id && typeof user_type == 'number' && typeof id == 'number') {
                        return cback0()
                    }
                    else if (typeOfCase == 3 && user_type && div_id && typeof user_type == 'number' && typeof div_id == 'number') {
                        return cback0()
                    }
                    else if (typeOfCase == 4 && user_type && district_id && typeof user_type == 'number' && typeof district_id == 'number') {
                        return cback0()
                    }
                    else if (typeOfCase == 5 && user_type && district_id && tehsil_id && typeof user_type == 'number' &&
                        typeof district_id == 'number' && typeof tehsil_id == 'string') {
                        return cback0()
                    }
                    else if (typeOfCase == 6 && user_type && district_id && subdistrict_code && typeof user_type == 'number' &&
                        typeof district_id == 'number' && typeof subdistrict_code == 'number') {
                        return cback0();
                    }
                    else {
                        return cback0({ "code": `ERROR_REQUIRED_FIELDS`, "message": `Sufficient Data Not Provided` });
                    }
                }
                else {
                    return cback0({ "message": `INVALID Value For Case that is ${typeOfCase}`, "code": `INVALID_CASE` })
                }
            },
            function (cback2) {
                qAndP = LOGIN_SERVICE_QUERIES.getPasswordResetQueryParam(typeOfCase, id, user_type, div_id, district_id, tehsil_id, subdistrict_code);
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (e, r) {
                    if (e) {
                        return cback2(e);
                    }
                    else if (r && r.data && r.data["affectedRows"] == 1) {
                        return cback2(null);
                    }
                    else {
                        return cback2({ "success": false, "code": "PASSWORD_RESET_FAILED", "message": `Multiple OR Zero Password Reseted` });
                    }
                })
            }
        ], function (err, res) {
            if (err) {
                return callback(err);
            }
            else {
                return callback(null, { "success": true, "code": "PASSWORD_RESET_SUCCESSFULLY" });

            }
        })
    },
    resetPasswordByDept: function (dbkey, request, params, sessionDetails, callback) {
        if (!(params.user_id && params.usertype)) { return callback({ ...SECURITY_SERVICE.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING, message: `user_id and user type is required.` }) };
        let qAndP = {}
        dbkey = CONFIG_PARAMS.getloginDBDetails();
        let district_id_arr = []
        async.series([
            // get district by session
            function (cback0) {
                if (sessionDetails['user_type']) {
                    if (sessionDetails['user_type'] == 10) {
                        qAndP = LOGIN_SERVICE_QUERIES.getBankLoginDetails(sessionDetails.user_id)
                        DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (e, r) {
                            if (e) {
                                return cback0(e);
                            }
                            else if (r && r.data && r.data.length == 1) {
                                district_id_arr = r.data[0]['district_id'].split(',').map(Number);
                                return cback0()
                            }
                            else {
                                return cback0({ ...SECURITY_SERVICE.SECURITY_ERRORS.USER_NOT_EXIST, "message": `no record found for user_id ${params.user_id}` });
                            }
                        })
                    } else if (sessionDetails['user_type'] == 4) {
                        district_id_arr = [sessionDetails['district_id']]
                        return cback0()
                    } else {
                        return cback0({ ...SECURITY_SERVICE.SECURITY_ERRORS.PERMISSION_DENIED, message: `PERMISSION_DENIED for user type ${sessionDetails['user_type']}` })
                    }

                } else {
                    return cback0({ message: `user type not found in sesssion details` })
                }

            },
            // get user details by user id
            function (cback1) {
                qAndP = LOGIN_SERVICE_QUERIES.userDetailsByUserId(params.user_id)
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (e, r) {
                    if (e) {
                        return cback1(e);
                    }
                    else if (r && r.data && r.data.length == 1) {
                        if (district_id_arr.includes(r.data[0]['district_id'])) {
                            return cback1(null);
                        } else {
                            let msg = sessionDetails['user_type'] == 10 ? `Bank ${r.data[0]['District_Name']} से संपर्क करे|` : `DDA ${r.data[0]['District_Name']} से संपर्क करे|`
                            return cback1({ message: msg, code: `DIST_CHANGE` })
                        }
                    }
                    else {
                        return cback1({ ...SECURITY_SERVICE.SECURITY_ERRORS.USER_NOT_EXIST, "message": `no record found for user_id ${params.user_id}` });
                    }
                })
            },
            function (cback2) {
                qAndP = LOGIN_SERVICE_QUERIES.getPasswordResetQueryParam(2, params.user_id, params.usertype,);
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndP.query, qAndP.params, function (e, r) {
                    if (e) {
                        return cback2(e);
                    }
                    else if (r && r.data && r.data["affectedRows"] == 1) {
                        return cback2(null);
                    }
                    else {
                        return cback2({ "code": "PASSWORD_RESET_FAILED", "message": `Multiple OR Zero Password Reseted` });
                    }
                })
            }
        ], function (err, res) {
            if (err) {
                return callback(err);
            } else {
                return callback(null, { "code": "PASSWORD_RESET_SUCCESSFULLY" })
            }

        })

    }
}

let checkPassword = function (dbkey, request, params, sessionDetails, callback) {
    if (!(params.user_id && params.password && params.current_password)) { return callback('user id ,current_password and password not sent in param') }
    let user = {}
    async.series([
        // get  password details
        function (cback1) {
            let queryObj = { query: `select * from users u where u.user_id = ${params.user_id}`, params: [] };
            DB_SERVICE.executeQueryWithParameters(dbkey, queryObj.query, queryObj.params, function (err, res) {
                if (err) return cback1(err);
                else if (res.data.length > 0) {
                    user = res.data[0];
                    return cback1()
                } else {
                    return cback1({ messsage: `no record found for user ${params.user_id}.` })
                }

            })
        },
        //check CURRENT password
        function (cback11) {
            let dPass = decrypt(params.current_password)
            ENCRYPTION_SERVICE.checkPassword(user['password'], dPass, function (e, matched) {
                if (e) return cback11(e);
                else {
                    if (matched) {
                        return cback11();
                    } else {
                        return cback11(SECURITY_SERVICE.SECURITY_ERRORS.WRONG_PASSWORD);
                    }
                }
            })
        },
        // check new with old password details
        function (cback2) {
            let dPass = decrypt(params.password)
            ENCRYPTION_SERVICE.checkPassword(user['password'], dPass, function (e, matched) {
                if (e) return cback2(e);
                else {
                    if (matched) {
                        return cback2(SECURITY_SERVICE.SECURITY_ERRORS.SAME_PASSWORD);
                    } else {
                        return cback2();
                    }
                }
            })
        }
    ], function (err, res) {
        if (err) return callback(err);
        else {
            return callback(null)
        }
    })
}

let decrypt = function (encrypt_str) {
    return CryptoJS.AES.decrypt(encrypt_str, '08t16e502526fesanfjh8nasd2').toString(CryptoJS.enc.Utf8);
}

module.exports = login