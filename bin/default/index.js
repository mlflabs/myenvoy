const path = require('path');
var express = require('express');

router = express.Router();
//require('dotenv').config()

// my custom route
router.get('/ok', function(req, res) {
  res.send("ok");
});

var opts = {
    couchHost: 'http://mike:pass@localhost:5984',
    databaseName: 'jwttest',
    usersDatabaseName: 'jwtusers',
    auth: 'jwt',
    access: '',
    authTokenSecret: 'secret',
    authTokenLength: '1d',
    logFormat: 'dev',
    production: false, 
    port: 9000,
    static: path.join(__dirname, './public'),
    router: router
};
 
const envoy = require('../../app')(opts);
envoy.events.on('listening', function() {
  console.log('[OK]  Server is up');
});
   
