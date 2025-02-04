var securityService = global.SECURITY_SERVICE;
var prefix = global.apiPrefix;

var init = function (app) {
    app.get(prefix + '/common/get/:function_name', function (req, res, next) {
        
        securityService.commonFunctionToCall('common', req.params['function_name'], req, res, req.query, true);
    });

    app.post(prefix + '/common/post/:function_name', function (req, res, next) {
        
        securityService.commonFunctionToCall('common', req.params['function_name'], req, res, req.body, true);
    });

    app.get(prefix + '/master/get/:function_name', function (req, res, next) {
        
        securityService.commonFunctionToCall('master', req.params['function_name'], req, res, req.query, false)
    });

    app.post(prefix + '/master/post/:function_name', function (req, res, next) {
        
        securityService.commonFunctionToCall('master', req.params['function_name'], req, res, req.body, true);
    });
    app.post(prefix + '/test/post/:function_name', function (req, res, next) {
        
        securityService.commonFunctionToCall('test', req.params['function_name'], req, res, req.body, true);
    });
    app.get(prefix + '/test/get/:function_name', function (req, res, next) {
        securityService.commonFunctionToCall('test', req.params['function_name'], req, res, req.query, true);
    });
}

module.exports.init = init;