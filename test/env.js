/* eslint-env mocha */
'use strict'

var assert = require('assert')

var env = require('../lib/env.js')

describe('environment variable tests - Bluemix mode', function (done) {
  var originalEnv
  before(function (done) {
    originalEnv = Object.assign({}, process.env)
    process.env.VCAP_SERVICES = '{"cloudantNoSQLDB":[{"name":"cloudant",' +
      '"label":"cloudantNoSQLDB","plan":"Shared","credentials":{"username":' +
      '"theusername","password":"thepassword","host":"theusername.' +
      'cloudant.com","port":443,"url":"https://theusername:thepassword' +
      '@thehost.cloudant.com"}}]}'
    process.env.PORT = '8080'
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    process.env.ENVOY_STATIC = 'public'
    delete process.env.COUCH_HOST
    done()
  })

  // parses VCAP_SERVICES successfully
  it('parse VCAP_SERVICES', function (done) {
    var e = env.setup()
    assert.strictEqual(e.couchHost,
      'https://theusername:thepassword@theusername.cloudant.com')
    assert.strictEqual(e.databaseName, 'mydb')
    assert.strictEqual(e.port, 8080)
    assert.strictEqual(e.static, 'public')
    done()
  })

  // assumes envoy when missing process.env.ENVOY_DATABASE_NAME
  it('missing ENVOY_DATABASE_NAME', function (done) {
    delete process.env.ENVOY_DATABASE_NAME
    var e = env.setup()
    assert.strictEqual(e.databaseName, 'envoy')
    done()
  })

  // invalid VCAP_SERVICES json
  it('invalid VCAP_SERVICES JSON', function (done) {
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    process.env.VCAP_SERVICES = '{"badjson}'

    assert.throws(function () {
      env.setup()
    })

    done()
  })

  // valid VCAP_SERVICES json but no services
  it('valid VCAP_SERVICES JSON but no services', function (done) {
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    process.env.VCAP_SERVICES = '{"someservice":[]}'
    assert.throws(function () {
      env.setup()
    })

    done()
  })

  // valid VCAP_SERVICES json but no Cloudant service
  it('valid VCAP_SERVICES JSON but no Cloudant service', function (done) {
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    process.env.VCAP_SERVICES = '{"cloudantNoSQLDB":[]}'
    assert.throws(function () {
      env.setup()
    })

    done()
  })

  after(function (done) {
    process.env = originalEnv
    done()
  })
})

describe('environment variable tests - Piecemeal mode', function () {
  var originalEnv

  before(function (done) {
    // backup current env variables
    originalEnv = Object.assign({}, process.env)
    process.env.COUCH_HOST = 'https://thehost'
    process.env.PORT = '8080'
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    done()
  })

  // parses VCAP_SERVICES successfully
  it('piecemeal mode successful', function (done) {
    var e = env.setup()
    assert.strictEqual(e.couchHost, 'https://thehost')
    assert.strictEqual(e.port, '8080')
    assert.strictEqual(e.databaseName, 'mydb')
    done()
  })

  // try missing COUCH_HOST value
  it('throw exception when missing ACCOUNT', function (done) {
    delete process.env.COUCH_HOST
    process.env.PORT = '8080'
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    assert.throws(function () {
      env.setup()
    })
    done()
  })

  // try missing PORT value
  it('defaults to 8000 when missing PORT', function (done) {
    process.env.COUCH_HOST = 'https://thehost'
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    delete process.env.PORT
    var e = env.setup()
    assert.strictEqual(e.port, 8000)
    done()
  })

  // try invalid PORT value
  it('throw exception when non-numeric PORT', function (done) {
    process.env.COUCH_HOST = 'https://thehost'
    process.env.ENVOY_DATABASE_NAME = 'mydb'
    process.env.PORT = '49a'
    assert.throws(function () {
      env.setup()
    })
    done()
  })

  after(function (done) {
    // restore env variables as they were before the test
    process.env = originalEnv
    done()
  })
})
