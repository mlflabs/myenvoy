const crypto = require('crypto')
const uuid = require('uuid')
const app = require('../../../app')
const express = require('express')
const router = express.Router()
let dbName = null
let usersdb = null
const jwt = require('jsonwebtoken');
const basicAuth = require('basic-auth')

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
      const salt = uuid.v4()
      const user = {
        _id: username,
        type: 'user',
        name: username,
        roles: [],
        channels: [],
        username: username,
        password_scheme: 'simple',
        salt: salt,
        password: sha1(salt + password),
        meta: meta
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
  if (req.session.user) {
    return next()
  }

  //load user token from headers
  const token = req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.opts.authTokenSecret, function(err, decoded) {       
      if (err) {
        if(err.name === 'TokenExpiredError'){
          return unauthorized(res, 'Authentication token has expired');
        }
        return unauthorized(res);  
      } else {
        const user = {name: decoded.user, exp: decoded.exp, channels: decoded.channels};
        req.session.user = user
        req.user = decoded.user;
        next();
      }
    });

  } else {
    return unauthorized(res)
  }
}

const getToken = (req, res) => {
  // extract name and pass
  const name = req.body.name || req.query.name;
  const pass = req.body.pass || req.query.pass;
  if (!name || !pass) {
    return unauthorized(res, 'Authentication error - please verify your name and password')
  }

  // validate user and save to session
  usersdb.get(name, (err, data) => {
    if (err || !data || data.password !== sha1(data.salt + pass)) {
      return unauthorized(res)
    } else {
     token =   jwt.sign({ user : data._id, },app.opts.authTokenSecret,
        { expiresIn: app.opts.authTokenLength});
    
      return res.send(token);
    }
  })
}




// the response to requests which are not authorised
const unauthorized = (res, reason = null) => {
  if(!reason) resason = 'Authentication error - please verify your authorization token';
  return res.status(403).send({ error: 'unauthorized', reason: reason })
}

 
  

// allow clients to see if they are logged in or not
const authResponse = (req, res) => {
  res.send({
    loggedin: !!req.user,
    username: req.user
  })
}


router.get('/_auth', isAuthenticated, authResponse);
router.post('/_token', getToken);
router.get('/_token', getToken);

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


