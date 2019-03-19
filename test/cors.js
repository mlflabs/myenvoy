/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var cloudant = null

var app = require('../app')

var fakedomain = 'http://mydomain.com'

var fakedomainChangedCors = 'http://corstest.com'

var fakeacl = 'X-PINGOTHER, Content-Type'

var remote = null

describe('cors', function () {
  before(function () {
    return testUtils.createUser().then(function (url) {
      url = url.replace(/\/[a-z0-9]+$/, '')
      var headers = {
        origin: fakedomain,
        'Access-Control-Request-Headers': fakeacl
      }
      cloudant = require('nano')({ url: url, requestDefaults: { headers: headers } })
      remote = cloudant.db.use(app.dbName)
    })
  })

  it('select records with CORS headers', function (done) {
    // Cloudant "/db/_all_docs"
    remote.list(function (err, response, headers) {
      assert.strictEqual(err, null)
      done()
    })
  })

  before(function () {
    return testUtils.createUser().then(function (url) {
      url = url.replace(/\/[a-z0-9]+$/, '')
      var headers = {
        origin: fakedomainChangedCors,
        'Access-Control-Request-Headers': fakeacl
      }
      cloudant = require('nano')({ url: url, requestDefaults: { headers: headers } })
      remote = cloudant.db.use(app.dbName)
    })
  })
  it('should not touch pre-existing CORS headers', function (done) {
    remote.list(function (err, response, headers) {
      assert.strictEqual(err, null)
      assert.strictEqual(headers['access-control-allow-credentials'], 'foo')
      assert.strictEqual(headers['access-control-allow-origin'], 'bar')
      assert.strictEqual(headers['access-control-allow-headers'], 'baz')
      done()
    })
  })
})
