// This file contains functions that checks the database exists and set
// up the views that need to be in place on the Cloudant side.
//
// Exported functions should take a callback as their sole
// parameter, which will be passed an error (which can be
// null) and an optional result:
//
// callback(err, result)
//
// Calling the callback with a non-null 'err' will terminate
// the startup process.

const url = require('url')
const path = require('path')
const app = require('../app')
const fs = require('fs')
const globalchanges = require('./globalchanges.js')
const changesdb = require('./changesdb.js')

const createDB = (callback/* (err, result) */) => {
  const e = app.opts

  app.cloudant.db.create(e.databaseName, (err, body, header) => {
    // 201 response == created
    // 412 response == already exists
    if (err || (header.statusCode !== 201 && header.statusCode !== 412)) {
      callback(err || body)
      return
    }

    callback(null, '[OK]  Created database ' + e.databaseName)
  })
}
exports.createDB = createDB

const verifyDB = (callback/* (err, result) */) => {
  const dburl = url.parse(app.db.config.url)
  dburl.pathname = '/' + app.dbName
  dburl.auth = ''

  app.db.info((err) => {
    if (err) {
      const errorMsg = '[ERR] verifyDB: ' +
        'please create the database on: ' + dburl.format() +
        '\n\n\t curl -XPUT ' + dburl.format() + ' -u KEY:PASS'

      if (err.statusCode === 404) {
        createDB((err) => {
          if (err) {
            callback(err.statusCode, errorMsg)
          } else {
            callback(null, '[OK]  verifyDB: database found "' + app.dbName + '"')
          }
        })
      } else {
        callback(err.statusCode, errorMsg)
      }
    } else {
      callback(null, '[OK]  verifyDB: database found "' +
          app.dbName + '"')
    }
  })
}
exports.verifyDB = verifyDB

const verifySecurityDoc = (callback/* (err, result) */) => {
  // NOTE the cloudant library has a get_security() function
  // but due to a bug in wilson it doesn't work when accessed
  // with an API key:
  // https://cloudant.fogbugz.com/f/cases/59877/Wilson-returns-500-when-using-API-key
  app.cloudant.request({
    db: app.dbName,
    path: '_security'
  }, (error, body) => {
    if (error) {
      const dburl = url.parse(app.db.config.url)
      dburl.pathname = '/' + app.dbName
      dburl.auth = ''
      callback(error.statusCode, '[ERR] verifySecurityDoc: ' +
        'Couldn’t confirm security permissions in \n\n\t' +
        dburl.format() + '\n\n' +
        JSON.stringify(error) + '\n\n' +
        body + '\n\n\t' +
        'Please check permissions for the ' +
        'specified key. Admin rights required.')
    } else {
      callback(null, '[OK]  verifySecurityDoc: permissions good')
    }
  })
}

exports.verifySecurityDoc = verifySecurityDoc

// ensure we are using a Cloudant instance that has POST /db/_bulk_get
exports.verifyBulkGet = (callback) => {
  app.cloudant.request({
    method: 'get',
    db: app.dbName,
    path: '_bulk_get'
  }, (err, body) => {
    // if the cluster supports POST /db/_bulk_get then it will reply with
    // a 405 (Method not supported) when pinged with GET /db/_bulk_get.
    // Clusters without POST /db/_bulk_get will respond with 404
    if (err && err.statusCode === 405) {
      return callback(null, '[OK]  verifyBulkGet: _bulk_get present')
    }
    return callback(new Error('[OK]  verifyBulkGet: If you\'re using Cloudant, contact support@cloudant.com and ask for your Cloudant account to migrated to the Porter or Sling clusters. Apache CouchDB users should ensure they\'re using the very latest CouchDB code > 2.0'))
  })
}

exports.setupChangesDB =  (callback) => {
  const dbName = path.join(process.cwd(),'data', app.dbName)
  changesdb.setup(dbName).then((res) => {
    callback(null, '[OK]  setupChangesDB: ok');
    app.changesdb = changesdb;
  });
}

exports.spoolChanges = (callback) => {
  // spool the changes feeds in one long HTTP request
  globalchanges.spool().then(res =>{
      globalchanges.start(res);
      // emit the listening event to show that we've spooled the changes
      // and we are ready to serve
      app.events.emit('listening');
      callback(null, '[OK]  spoolChanges: started');
  });
}
