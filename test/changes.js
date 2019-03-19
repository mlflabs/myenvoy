/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var PouchDB = require('pouchdb')
const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('changes', function () {
  it('sequence', async () => {
    let docCount = 2
    let docs = testUtils.makeDocs(docCount)
    let remote = null
    let seq1 = ''
    let id, rev, response, remoteURL, user

    try{
      remoteURL = await testUtils.createUser();
      user= remoteURL.split(':')[1].substring(2);
      remote = new PouchDB(remoteURL)
      const res2 = await remote.bulkDocs(docs);
      await wait(500)
      response = await remote.changes()

      assert(response.results)
      assert(response.results.length >= 1)
      seq1 = response.last_seq

      // Update a document
      let newDoc = testUtils.makeDocs(1)[0]

      //make sure doc has proper access
      newDoc = Object.assign(newDoc, { meta_access: ['u|'+user] });
      newDoc._id = response.results[0].id
      newDoc._rev = response.results[0].changes[0].rev
      
      response = await remote.put(newDoc)
      id = response.id
      rev = response.rev
      await wait(1000)

      response = await remote.changes({ since: seq1 })
      // testUtils.d('FINAL', response);
      assert.strictEqual(response.results.length, 1,
        'Changes feed should contain single entry')
      assert.strictEqual(response.results[0].id, id,
        'ID of document should be the one that was updated')
      assert.strictEqual(response.results[0].changes[0].rev, rev,
        'Rev of document should be the one that was updated')

    }
    catch(err){
      assert(false)
    }
  })

  it('changes with filter is not allowed', function () {
    var remote = null

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.changes({ filter: 'x' })
    }).then(function (r) {
      assert(false)
    }).catch(function (e) {
      assert.strictEqual(e.status, 403)
    })
  })
})
