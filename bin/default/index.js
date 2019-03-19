require('dotenv').config();
const path = require('path');
const express = require('express');

console.log('PORT::: ', process.env.COUCH_HOST);

router = express.Router();

// my custom route
router.get('/ok', async (req, res) => {
  res.send("ok");
});

const envoy = require('../../app')();
envoy.events.on('listening', function() {
  console.log('[OK]  Server is up: ', envoy.opts.port);
});