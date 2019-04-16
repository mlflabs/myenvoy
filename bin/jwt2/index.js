require('dotenv').config();
const path = require('path');
const express = require('express');

console.log('PORT::: ', process.env.COUCH_HOST);

router = express.Router();

// my custom route
router.get('/ok', async (req, res) => {
  res.send("ok");
});




// edit user, for now only allow username and password
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








const envoy = require('../../app')({router: router});
envoy.events.on('listening', function() {
  console.log('[OK]  Server is up: ', envoy.opts.port);
});