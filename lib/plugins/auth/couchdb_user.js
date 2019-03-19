const basicAuth = require('basic-auth')
const USERS_DATABASE_NAME = '_users'
const app = require('../../../app')
const express = require('express')
const router = express.Router()
let usersdb = null

// create _users database if it doesn't exist already
// called at startup
const init = (callback) => {
  usersdb = app.cloudant.db.use(USERS_DATABASE_NAME)
  app.cloudant.db.create(USERS_DATABASE_NAME, (err, body, header) => {
    // 201 response == created
    // 412 response == already exists
    if ((err && err.statusCode !== 412) ||
         (!err && header.statusCode !== 201)) {
      return callback(err, '[ERR] createUsersDB: please log into your CouchDB Dashboard and create a new database called _users.')
    }
    callback(null, '[OK]  Created _users database')
  })
}

// create a new user - this function is used by the
// test suite to generate a new user
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
      const user = {
        _id: 'org.couchdb.user:' + username,
        type: 'user',
        name: username,
        roles: [],
        username: username,
        password_scheme: 'simple',
        password: password,
        seq: seq,
        meta: meta
      }
      usersdb.insert(user, (err, data) => {
        if (err) {
          err = { message: err.message }
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
    usersdb.get('org.couchdb.user:' + id, (err, data) => {
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
  app.cloudant.auth(user.name, user.pass, (err, data) => {
    if (!err && data) {
      req.session.user = data
      return next()
    } else {
      return unauthorized(res)
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
  app.cloudant.auth(user.name, user.pass, (err, data) => {
    if (!err && data) {
      req.session.user = data
      return next()
    } else {
      return unauthorized(res)
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
