require('dotenv').config();
var express = require('express');
router = express.Router();

// my custom route
router.get('/ok', function(req, res) {
  res.send("ok");
});

const envoy = require('../../app')();
envoy.events.on('listening', function() {
  console.log('[OK]  Server is up');
});
   
