/* eslint-env mocha */
'use strict'
/* globals testUtils */

var PouchDB = require('pouchdb')

var assert = require('assert')

describe('performance', function () {
  this.timeout(1200000)

  describe('test single user sync', function () {
    var dbs = {}
    beforeEach(function (done) {
      dbs = { local: 'testdb' }
      testUtils.cleanup([dbs.local], done)
    })

    afterEach(function (done) {
      testUtils.cleanup([dbs.local], done)
    })

    it('pull replication', function () {
      var remoteURL = testUtils.url('test', 'password')
      var local = new PouchDB(dbs.local)
      var remote = new PouchDB(remoteURL, { ajax: { timeout: 1200000 } })

      return local.replicate.from(remote)
        .then(function (info) {
          assert.strictEqual(info.docs_written, 100)
        })
    })
  })
})
