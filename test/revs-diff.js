/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var chance = require('chance')()

var PouchDB = require('pouchdb')

describe('revsDiff', function () {
  it('single user', function () {
    var docCount = 1

    var docs = testUtils.makeDocs(docCount)

    var remote = null

    var fakeid = chance.guid()

    var fakerev = '1-f5cecfc5e2d5ea3e8b254e21d990fa7c'

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.bulkDocs(docs)
    }).then(function (response) {
      var newDoc = testUtils.makeDocs(1)[0]
      newDoc._id = response[0].id
      newDoc._rev = response[0].rev
      return remote.put(newDoc)
    }).then(function (response) {
      var payload = {}
      payload[fakeid] = [fakerev]
      payload[response.id] = [response.rev]
      return remote.revsDiff(payload)
    }).then(function (response) {
      // id present
      assert(response[fakeid])

      // single id
      assert.strictEqual(Object.keys(response).length, 1,
        'Revsdiff listing should have a single entry')

      // rev present
      assert.strictEqual(response[fakeid].missing.indexOf(fakerev), 0,
        'Revision should be present')

      // single revision
      assert.strictEqual(response[fakeid].missing.length, 1,
        'Single revision')
    })
  })

  it('multiple users', function () {
    var docCount = 1

    var docs = testUtils.makeDocs(docCount)

    var docs2 = testUtils.makeDocs(docCount)

    var remote = null

    var remote2 = null

    var fakeid = chance.guid()

    var fakerev = '1-45cecfc5e2d5ea3e8b254f21d990fa7a'

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return testUtils.createUser()
    }).then(function (remoteURL2) {
      remote2 = new PouchDB(remoteURL2)
      return remote2.bulkDocs(docs2)
    }).then(function () {
      return remote.bulkDocs(docs)
    }).then(function (response) {
      var newDoc = testUtils.makeDocs(1)[0]
      newDoc._id = response[0].id
      newDoc._rev = response[0].rev
      return remote.put(newDoc)
    }).then(function (response) {
      var payload = {}
      payload[fakeid] = [fakerev]
      payload[response.id] = [response.rev]
      return remote.revsDiff(payload)
    }).then(function (response) {
      // id present
      assert(response[fakeid])

      // single id
      assert.strictEqual(Object.keys(response).length, 1,
        'Revsdiff listing should have a single entry')

      // rev present
      assert.strictEqual(response[fakeid].missing.indexOf(fakerev), 0,
        'Revision should be present')

      // single revision
      assert.strictEqual(response[fakeid].missing.length, 1,
        'Single revision')
    }).catch(function (x) {
      console.log('X', x)
    })
  })

  it('bad revs_diff request user', function (done) {
    testUtils.createUser().then(function (remoteURL) {
      var request = require('request')
      var r = {
        url: remoteURL + '/_revs_diff',
        method: 'post',
        body: { docs: {} },
        json: true
      }
      request(r, function (err, resp, body) {
        assert.strictEqual(err, null)
        assert.strictEqual(resp.statusCode, 500)
        done()
      })
    })
  })
})
