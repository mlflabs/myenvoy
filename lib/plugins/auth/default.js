const basicAuth = require('basic-auth')
const crypto = require('crypto')
const uuid = require('uuid')
const app = require('../../../app')
const express = require('express')
const router = express.Router()
let dbName = null
let usersdb = null

// create envoyusers database if it doesn't exist already
// called at startup
const init = (callback) => {
  dbName = app.opts.usersDatabaseName
  usersdb = app.cloudant.db.use(dbName)

  app.cloudant.db.get(dbName, (err, body, header) => {
    if ((err && err.statusCode === 404)) {
      // 404 response == DB doesn't exist, try to create it
      app.cloudant.db.create(dbName, (err, body, header) => {
        if (err && err.statusCode !== 412) {
          // 412 response == already exists, maybe the DB got created between checking and creating?
          // any other error response, bail out
          return callback(err, '[ERR] createUsersDB: please log into your CouchDB Dashboard and create a new database called ' + dbName + '.')
        } else if (!err && header.statusCode === 201) {
          // 201 response == created, we can start
          callback(null, '[OK]  Created users database: ' + dbName)
        }
      })
    } else if ((err && err.statusCode === 403)) {
      // 403 response == something's up with permissions
      return callback(err, '[ERR] createUsersDB: please ensure API key and/or database permissions are correct for  ' + dbName + ' (403 Forbidden).')
    } else if (!err && header.statusCode === 200) {
      // 200 response == database found, we can start
      callback(null, '[OK]  Users database already exists: ' + dbName)
    }
  })
}

// returns the sha1 of a string
const sha1 = (string) => {
  return crypto.createHash('sha1').update(string).digest('hex')
}

// create a new user - this function is used by the
// test suite to generate a new user. Our envoyusers database
// follows a similar pattern to the CouchDB _users database
// but we perform the salt/hash process here
const newUser = (username, password, meta, callback) => {
  // get the seqence number of the main database. As this is a new user
  // they won't be interested in changes before this sequence number
  // so if we store the 'current' sequence number, we can intercept
  // requests for /db/changes?since=0 for /db/changes?since=x and get
  // the same answer (much more quickly)
  return new Promise((resolve, reject) => {
    app.cloudant.db.changes(app.dbName, { limit: 1, descending: true }, (err, data) => {
      let seq = null
      if (!err) {
        seq = data.last_seq
      }

      let meta_access = {};
      if(meta[app.opts.accessMetaKey]){
        meta_access = meta[app.opts.accessMetaKey];
        delete meta[app.opts.accessMetaKey]
      }

      const salt = uuid.v4()
      const user = {
        _id: username,
        type: 'user',
        name: username,
        roles: [],
        username: username,
        password_scheme: 'simple',
        salt: salt,
        password: sha1(salt + password),
        seq: seq,
        meta: meta,
        [app.opts.accessMetaKey]: meta_access
      }
      usersdb.insert(user, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
        if (typeof callback === 'function') {
          callback(err, data)
        }
      })
    })
  })
}


// get an existing user by its id
const getUser = (id, callback) => {
  return new Promise((resolve, reject) => {
    usersdb.get(id, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
      if (typeof callback === 'function') {
        callback(err, data)
      };
    })
  })
}

// Express middleware that is the gatekeeper for whether a request is
// allowed to proceed or not. It checks with Cloudant to see if the
// supplied Basic Auth credentials are correct and issues a session cookie
// if they are. The next request (with a valid cookie), doesn't need to
// hit the users database
const isAuthenticated = (req, res, next) => {
  // if the user has valid session then we're good to go
  // without hitting the _users database again
  if (req.session.user) {
    return next()
  }

  // extract basic auth
  const user = basicAuth(req)
  if (!user || !user.name || !user.pass) {
    return unauthorized(res)
  }

  // validate user and save to session
  usersdb.get(user.name, (err, data) => {
    if (err || !data || data.password !== sha1(data.salt + user.pass)) {
      return unauthorized(res)
    } else {
      req.session.user = data
      return next()
    }
  })
}

const isPostAuthenticated = (req, res, next) => {
  // if the user has valid session then we're good to go
  // without hitting the _users database again
  if (req.session.user) {
    return next()
  }

  const user = {
    name: req.body.name,
    pass: req.body.password
  }
  if (!user || !user.name || !user.pass) {
    return unauthorized(res)
  }

  // validate user and save to session
  usersdb.get(user.name, (err, data) => {
    if (err || !data || data.password !== sha1(data.salt + user.pass)) {
      return unauthorized(res)
    } else {
      req.session.user = data
      return next()
    }
  })
}

// the response to requests which are not authorised
const unauthorized = (res) => {
  return res.status(403).send({ error: 'unauthorized', reason: 'Authentication error - please verify your username/password' })
}

// allow clients to see if they are logged in or not
const authResponse = (req, res) => {
  res.send({
    loggedin: !!req.session.user,
    username: req.session.user ? req.session.user.name : null
  })
}
router.get('/_auth', isAuthenticated, authResponse)
router.post('/_auth', isPostAuthenticated, authResponse)

// and to log out
router.get('/_logout', (req, res) => {
  delete req.session.user
  res.send({ ok: true })
})

module.exports = () => {
  return {
    init: init,
    newUser: newUser,
    getUser: getUser,
    isAuthenticated: isAuthenticated,
    unauthorized: unauthorized,
    routes: router
  }
}
