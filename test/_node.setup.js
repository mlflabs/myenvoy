/* eslint-env mocha */
'use strict'

process.env.ENVOY_DATABASE_NAME =
  (process.env.ENVOY_DATABASE_NAME || 'zenvoy') +
    (new Date().getTime())
  

// enable /_adduser endpoint
process.env.PRODUCTION = 'false'
//  process.env.LOG_FORMAT='dev';
var testsDir = process.env.TESTS_DIR || './tmp'
var exec = require('child_process').exec
var cors = require('./cors-middleware')

function cleanup () {
  // Remove test databases
  exec('rm -r ' + testsDir)
}
exec('mkdir -p ' + testsDir, function () {
  process.on('SIGINT', cleanup)
  process.on('exit', cleanup)
})

var app = require('../app')({
  middleware: [
    cors
  ]
})

// ensure server is started before running any tests
before(function (done) {
  app.events.on('listening', function () {
    console.log('[OK]  Server is up')
    done()
  })
})

global.testUtils = require('./utils.js')
global.username = 'foo'
