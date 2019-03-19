/* eslint-env mocha */
'use strict'
/* global testUtils */

var request = require('request')

var app = require('../app')

var assert = require('assert')

describe('auth', function () {
  var url1 = null

  var badurl1 = null

  var badurl2 = null

  var badurl3 = null

  var badurl4 = null

  var authmod = function (url, alter) {
    var URL = require('url')
    var parsed = URL.parse(url)
    switch (alter) {
      case 'username':
        parsed.auth = parsed.auth.replace(/^.+:/, 'badusername:')
        break
      case 'password':
        parsed.auth = parsed.auth.replace(/:.+$/, ':badpassword')
        break
      case 'both':
        parsed.auth = ':'
        break
      case 'all':
        delete parsed.auth
        break
    }
    return URL.format(parsed).slice(0, -1)
  }

  before(function () {
    return testUtils.createUser().then(function (remoteURL) {
      url1 = remoteURL.replace(/\/[a-z0-9]+$/, '')
      badurl1 = authmod(url1, 'all')
      badurl2 = authmod(url1, 'password')
      badurl3 = authmod(url1, 'username')
      badurl4 = authmod(url1, 'both')
    })
  })

  // check that we can login once with credentials
  // then call again with no credentials but with a cookie
  it('session login', function (done) {
    var r = {
      method: 'get',
      url: url1 + '/' + app.dbName + '/_all_docs',
      jar: true
    }
    request(r, function (err, resp, data) {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 200)
      // now try without credentials, it should still work
      // because of cookies
      var r = {
        method: 'get',
        url: badurl1 + '/' + app.dbName + '/_all_docs',
        jar: true
      }
      request(r, function (err, resp, data) {
        assert.strictEqual(err, null)
        assert.strictEqual(resp.statusCode, 200)

        // now call /_auth to see if we are logged in
        var r = {
          method: 'get',
          url: badurl1 + '/_auth',
          jar: true
        }
        request(r, function (err, resp, data) {
          assert.strictEqual(err, null)
          assert.strictEqual(resp.statusCode, 200)

          // now call /_logout to clear the session
          var r = {
            method: 'get',
            url: badurl1 + '/_logout',
            jar: true
          }
          request(r, function (err, resp, data) {
            assert.strictEqual(err, null)
            assert.strictEqual(resp.statusCode, 200)
            done()
          })
        })
      })
    })
  })

  // check we can't access a protected endpoint without credentials
  it('access denied with no credentials', function (done) {
    var r = {
      method: 'get',
      url: badurl1 + '/' + app.dbName + '/_all_docs'
    }
    request(r, function (err, resp, data) {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 403)
      done()
    })
  })

  // check we can't access a protected endpoint with bad password
  it('access denied with bad password', function (done) {
    var r = {
      method: 'get',
      url: badurl2 + '/' + app.dbName + '/_all_docs'
    }
    request(r, function (err, resp, data) {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 403)
      done()
    })
  })

  // check we can't access a protected endpoint with bad username
  it('access denied with bad username', function (done) {
    var r = {
      method: 'get',
      url: badurl3 + '/' + app.dbName + '/_all_docs'
    }
    request(r, function (err, resp, data) {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 403)
      done()
    })
  })

  // check we can't access a protected endpoint with empty username and password
  it('access denied with empty credentials', function (done) {
    var r = {
      method: 'get',
      url: badurl4 + '/' + app.dbName + '/_all_docs'
    }
    request(r, function (err, resp, data) {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 403)
      done()
    })
  })
})
