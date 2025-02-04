const bcrypt = require('bcrypt');

var encrypt = function (text) {
    return bcrypt.hash(text, 12);
}

var checkPassword = function (encrypted, nonencrypted, callback) {
    bcrypt.compare(nonencrypted, encrypted, function (err, res) {
        if (res === true) {
            return callback(null, true);
        }
        else {
            return callback(null, false);
        }
    });
}

module.exports.encrypt = encrypt;
module.exports.checkPassword = checkPassword;
