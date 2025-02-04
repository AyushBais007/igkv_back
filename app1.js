const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
var session = require('express-session');
const MSSqlStore = require('connect-mssql-v2');
const config = require('config');
const app = express();
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cors({
    credentials: true,
    origin: true,
}));

const staticPath = '/opt/ufp2024/backend/public';
app.use(express.static(staticPath));
app.use('/commonApi24', express.static(staticPath));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

const limit = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too Many Requests',
    standardHeaders: true,
});

app.use(limit);

var getDbKey = function (req, callback) {
    return callback(null, global.COMMON_CONFS.getWorkingDBDetails());
}

const db_config = {
    user: config.get('common_db.user'),
    password: config.get('common_db.password'),
    server: config.get('common_db.host'), // You can use 'localhost\\instance' to connect to named instance
    database: config.get('common_db.database'),
    options: {
        encrypt: true, // Use this if you're on Windows Azure
        trustServerCertificate: true, // use this if your MS SQL instance uses a self signed certificate
    },
};
const option = {
    ttl :1000 * 60 * 60 * 24, // (Time To Live) Determines the expiration date. Default: 1000 * 60 * 60 * 24 (24 hours)
    autoRemove :true,
    autoRemoveInterval :1000 * 60 * 10 //Sets the timer interval for each call to destroyExpired(). Default: 1000 * 60 * 10 (10 min)
};
const store = new MSSqlStore(db_config,option);

store.on('connect', () => {
    console.log('connection establised');

    // ... connection established
});

store.on('error', (error) => {
    console.log('connection error', error);
    // ... connection error
});

store.on('sessionError', (error, classMethod) => {
    console.log('sessionError', error);
    // ... any error that occurs within a store method
    // classMethod will return the method name (get, set, length, etc)
})
app.use(session({
    store: store,
    secret: 'supersecret',
    saveUninitialized: true,
    name: 'session',
    resave: true,
}));

if (app.get('env') === 'production') {
    app.set('trust proxy', 1); // trust first proxy
    session_config.cookie.secure = true; // serve secure cookies
}

app.use((req, res, next) => {
    getDbKey(req, function (dbkeyErr, dbkey, possibleRootuserId) {
        req.query.dbkey = dbkey;
        next();
    });
})


var initAllFiles = function () {
    global.apiPrefix = '/Api';
    global.COMMON_CONFS = require('./commonutils/commonconfs.js').ConfigParams;
    global.DB_SERVICE = require('./services/mysqldbservice.js');
    global.SECURITY_SERVICE = require('./services/securityservice.js');
    require('./routes/securityroutes').init(app);
    require('./routes/commonroutes').init(app);
};

initAllFiles();

module.exports = app;
