/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var PouchDB = require('pouchdb')

var chance = require('chance')()

describe('bulk_docs', function () {
  it('bulk_docs with server assigned ids', function () {
    var docCount = 5

    var docs = testUtils.makeDocs(docCount)

    var remote = null

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.bulkDocs(docs)
    }).then(function (response) {
      assert.strictEqual(response.length, docCount, response)
      response.forEach(function (row) {
        assert(!row.error)
      })

      // ensure we can retrieve what we inserted
      return remote.get(response[0].id)
    }).then(function (doc) {
      assert(doc._id)
    })
  })

  it('bulk_docs with user assigned ids', function () {
    var docCount = 2
    var docs = testUtils.makeDocs(docCount)

    var remote = null

    docs[0]._id = chance.guid()
    docs[1]._id = chance.guid()

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.bulkDocs(docs)
    }).then(function (response) {
      assert.strictEqual(response.length, docCount, response)
      response.forEach(function (row) {
        assert(!row.error)
      })

      // ensure we can retrieve what we inserted
      return remote.get(docs[0]._id)
    }).then(function (doc) {
      assert(doc._id)
    })
  })

  it('bulk_docs with both user and server assigned ids', function () {
    var docCount = 2
    var docs = testUtils.makeDocs(docCount)

    var remote = null

    docs[0]._id = chance.guid()

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.bulkDocs(docs)
    }).then(function (response) {
      assert.strictEqual(response.length, docCount, response)
      response.forEach(function (row) {
        assert(!row.error)
      })
    })
  })

  it('POST /db/_bulk_docs with bad docs parameter', function () {
    testUtils.createUser().then(function (remoteURL) {
      var request = require('request')
      var r = {
        method: 'post',
        url: remoteURL + '/_bulk_docs',
        body: ['a'],
        json: true
      }
      request(r, function (err, data, body) {
        assert.strictEqual(err, null)
        assert.strictEqual(data.statusCode, 400)
      })
    })
  })
})
