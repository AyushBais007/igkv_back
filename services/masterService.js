var DB_SERVICE = global.DB_SERVICE;
var CONFIG_PARAMS = global.COMMON_CONFS;
var securityService = require('./securityservice.js');
var MASTER_QUERIES = require('../queries/masterQueries.js');
var async = require('async');
const { getAllowedJsonFromPageId, getFilterValueFromAllowedJson } = require('./commonService.js')

let master = {
    getMenuByUser: function (dbkey, request, params, sessionDetails, callback) {
        if (!params.emp_id) return callback(securityService.SECURITY_ERRORS.MANDATORY_FIELDS_ARE_MISSING);
        let menu = {};
        let qAndpObj = MASTER_QUERIES.getMenuByUserQueryParamObj(params.emp_id);
        console.log(dbkey);
        dbkey = CONFIG_PARAMS.getIgkvDBDetails()
        DB_SERVICE.executeQueryWithParameters(dbkey, qAndpObj.query, qAndpObj.params, function (e1, r1) {
            console.log(e1,r1);
            
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
    getAllowedDistrict: function (dbkey, request, params, sessionDetails, callback) {
        sessionDetails.user_id = params.user_id
        let qAndpObj = MASTER_QUERIES.getAllDistrictQueryParamObj();
        let districts = [];
        async.series([
            function (cback1) {
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndpObj.query, qAndpObj.params, (e1, r1) => {
                    if (e1) {
                        return cback1(e1)
                    } else {
                        districts = r1.data
                        return cback1()
                    }
                })
            },
            function (cback2) {
                getFilterValueFromAllowedJson(dbkey, request, { page_id: params.page_id, filter_column: 'district_id', all_records: districts }, sessionDetails, function (err, res) {
                    if (err) {
                        return cback2(err)
                    } else if (res.hasOwnProperty('filter_records')) {
                        districts = res['filter_records']
                        return cback2()
                    } else {
                        return cback2({ message: `filter_records not received from getFilterValueFromAllowedJson function.` })
                    }
                })
            }
        ], function (err, res) {
            if (err) {
                return callback(err)
            } else {
                return callback(null, districts)
            }

        })

    },
    getAllowedCaste: function (dbkey, request, params, sessionDetails, callback) {
        sessionDetails.user_id = params.user_id
        let qAndpObj = MASTER_QUERIES.getMasCasteQueryParamObj();
        let casts = []
        async.series([
            function (cback1) {
                DB_SERVICE.executeQueryWithParameters(dbkey, qAndpObj.query, qAndpObj.params, (e1, r1) => {
                    if (e1) {
                        return cback1(e1)
                    } else {
                        casts = r1.data
                        return cback1()
                    }
                })
            },
            function (cback2) {
                getFilterValueFromAllowedJson(dbkey, request, { page_id: params.page_id, filter_column: 'caste_code', all_records: casts }, sessionDetails, function (err, res) {
                    if (err) {
                        return cback2(err)
                    } else if (res.hasOwnProperty('filter_records')) {
                        casts = res['filter_records']
                        return cback2()
                    } else {
                        return cback2({ message: `filter_records not received from getFilterValueFromAllowedJson function.` })
                    }
                })
            }

        ], function (err, res) {
            if (err) {
                return callback(err)
            } else {
                return callback(null, casts)
            }

        })

    },
    
    
}

function convertToModuleFormat(data) {
    const result = [];
  
    // Iterate through the input data
    data.forEach(item => {
      // Find if the module already exists in the result array
      let module = result.find(m => m.module_id === item.module_id);
  
      if (!module) {
        // If not, create a new module and add it to the result array
        module = {
          module_id: item.module_id,
          module_name: item.module_name,
          module_order_no: item.module_order_no,
          menus: []
        };
        result.push(module);
      }
  
      // Find if the menu already exists in the module
      let menu = module.menus.find(m => m.menu_id === item.menu_Id);
  
      if (!menu) {
        // If not, create a new menu and add it to the module's menus array
        menu = {
          menu_id: item.menu_Id,
          menu_name: item.menu_name,
          menu_order_no: item.menu_order_no,
          pages: []
        };
        module.menus.push(menu);
      }
  
      // Add the page to the menu's pages array
      menu.pages.push({
        page_id: item.page_id,
        page_name: item.page_name,
        page_order_no: item.page_order_no
      });
    });
  
    // Sort the modules, menus, and pages by their respective order numbers
    result.sort((a, b) => a.module_order_no - b.module_order_no);
  
    result.forEach(module => {
      module.menus.sort((a, b) => a.menu_order_no - b.menu_order_no);
      module.menus.forEach(menu => {
        menu.pages.sort((a, b) => a.page_order_no - b.page_order_no);
      });
    });
  
    return result;
  }
module.exports = master