const config = require('config');

var confs = {
    getCommonDBDetails: function () {
        return JSON.parse(JSON.stringify(config.get('common_db')));
    },
    getWorkingDBDetails: function () {
        return JSON.parse(JSON.stringify(config.get('working_db')));
    },
    getIgkvDBDetails: function () {
        return JSON.parse(JSON.stringify(config.get('igkv_db')));
    },
    getloginDBDetails: function () {
        return JSON.parse(JSON.stringify(config.get('working_db')));
    }
}





module.exports.ConfigParams = confs;