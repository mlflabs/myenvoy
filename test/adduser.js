/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var app = require('../app')

var env = require('../lib/env')

var remote = null

describe('adduser', function () {
  before(function () {
    var e = env.setup()
    remote = require('nano')('http://' + e.url)
  })

  it('add user successfully', function (done) {
    var username = testUtils.uniqueUsername()
    var password = 'password'
    var r = {
      path: '_adduser',
      method: 'post',
      body: {
        username: username,
        password: password
      }
    }
    remote.request(r, function (err, response) {
      assert(err == null)
      assert.strictEqual(typeof response.warning, 'string')
      assert.strictEqual(typeof response.ok, 'boolean')
      assert.strictEqual(response.ok, true)
      assert.strictEqual(typeof response.id, 'string')
      assert(response.id.endsWith(username))
      done()
    })
  })

  it('fail to add user - missing username', function (done) {
    var r = {
      path: '_adduser',
      method: 'post',
      body: {
        password: 'password'
      }
    }
    remote.request(r, function (err, response) {
      assert(err != null)
      done()
    })
  })

  it('fail to add user - missing password', function (done) {
    var r = {
      path: '_adduser',
      method: 'post',
      body: {
        username: testUtils.uniqueUsername()
      }
    }
    remote.request(r, function (err, response) {
      assert(err != null)
      done()
    })
  })

  it('duplicate user', function (done) {
    var username = testUtils.uniqueUsername()
    var r = {
      path: '_adduser',
      method: 'post',
      body: {
        username: username,
        password: 'password'
      }
    }
    remote.request(r, function (err, response) {
      assert.strictEqual(err, null)
      remote.request(r, function (err, response) {
        assert(err != null)
        done()
      })
    })
  })
})

describe('adduser programmatically', function () {
  it('create user', function () {
    var username = testUtils.uniqueUsername()
    var password = 'password'
    var meta = { a: 1, b: 2 }
    app.auth.newUser(username, password, meta).then(function (data) {
      return app.auth.getUser(username)
    }).then(function (data) {
      assert.strictEqual(typeof data, 'object')
      assert.strictEqual(data.type, 'user')
      assert.strictEqual(JSON.stringify(data.meta), JSON.stringify(meta))
    })
  })
})
