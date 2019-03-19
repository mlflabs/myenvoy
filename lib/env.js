// helper function to find credentials from environment variables

let opts; // hold all our env variables
let db; // hold our nano db instance;
let nano;
let usersdb;

const setup = (startOpts) => {
  if (!startOpts) {
    startOpts = {}
  }
  const production = (process.env.PRODUCTION === 'true')
  const opts = {
    accessPlugin: process.env.ENVOY_ACCESS || startOpts.access || 'default',
    authPlugin: process.env.ENVOY_AUTH || startOpts.auth || 'default',
    authTokenSecret: process.env.AUTH_TOKEN_SECRET || startOpts.authTokenSecret || 'secret',
    authTokenLength: process.env.AUTH_TOKEN_LENGTH || startOpts.authTokenLength || '1h',
    couchHost: process.env.COUCH_HOST || startOpts.couchHost || null,
    changesDbPlugin: process.env.CHANGESDB_PLUGIN || startOpts.changesDbPlugin || 'default',
    changesDbLocalDatabaseFilename: process.env.ENVOY_CHANGESDB_DATABASE_FILENAME || startOpts.changesDbFilename || 'db',
    databaseName: process.env.ENVOY_DATABASE_NAME || startOpts.databaseName || 'envoy',
    usersDatabaseName: process.env.ENVOY_USERS_DATABASE_NAME || startOpts.usersDatabaseName || 'envoyusers',
    logFormat: process.env.LOG_FORMAT || startOpts.logFormat || 'off',
    port: process.env.PORT || startOpts.port || 8000,
    url: null,
    production: production || startOpts.production || false,
    sessionKey: process.env.ENVOY_SESSION_KEY || startOpts.envoySessionKey || 'secret_session_key',
    static: process.env.ENVOY_STATIC || startOpts.static || null,

    router: startOpts.router || null,
    middleware: startOpts.middleware || [],

    //meta access
    accessMetaKey: process.env.ACCESS_META_KEY || startOpts.accessMetaKey || 'meta_access',
    projectKey: process.env.PROJECT_KEY || startOpts.projectKey || 'p' //use this to find parent project
  }

  if (process.env.VCAP_SERVICES) {
    // this will throw an exception if VCAP_SERVICES is not valid JSON
    const services = JSON.parse(process.env.VCAP_SERVICES)

    // extract Cloudant credentials from VCAP_SERVICES
    if (!opts.couchHost &&
        Array.isArray(services.cloudantNoSQLDB) &&
        services.cloudantNoSQLDB.length > 0 &&
        typeof services.cloudantNoSQLDB[0].credentials === 'object') {
      const bluemixOpts = services.cloudantNoSQLDB[0].credentials
      opts.couchHost = 'https://' +
        encodeURIComponent(bluemixOpts.username) + ':' +
        encodeURIComponent(bluemixOpts.password) + '@' +
        encodeURIComponent(bluemixOpts.username) + '.cloudant.com'
    }

    // bluemix/cloudfoundry config
    const cfenv = require('cfenv')
    const appEnv = cfenv.getAppEnv()
    opts.port = appEnv.port
    opts.url = appEnv.url
  }

  // piecemeal environment variables
  if (!opts.url) {
    opts.url = 'localhost:' + opts.port
  }
  if (!opts.couchHost || !opts.port) {
    throw (new Error('Missing env variable - must supply COUCH_HOST & PORT'))
  }
  if (typeof opts.port === 'string' && parseInt(opts.port, 10).toString() !== opts.port) {
    throw new Error('port ' + opts.port + ' must be an integer')
  }
  this.opts = opts;
  return opts
}

module.exports = {
  setup: setup,
  opts: opts,
  db: db
}
