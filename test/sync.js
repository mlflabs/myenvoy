/* eslint-env mocha */
'use strict'
/* globals testUtils */

var PouchDB = require('pouchdb')
//var pouchdbDebug = require('pouchdb-debug');
//PouchDB.plugin(pouchdbDebug);
//PouchDB.debug.enable('*');

var assert = require('assert')
const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// PouchDB.debug.enable('*');

// Generate a bunch of documents, and store those in a local
// PouchDB. Kick off a push replication, and then query remote
// end to ensure that all generated documents made it acrosss.
describe('test single user sync', function () {
  var dbs = {}
  beforeEach(function (done) {
    dbs = { local: 'testdb', secondary: 'testdb2' }
    testUtils.cleanup([dbs.local, dbs.secondary], done)
  })

  afterEach(function (done) {
    testUtils.cleanup([dbs.local, dbs.secondary], done)
  })

  it('push replication', async () => {
    try{
      let local = new PouchDB(dbs.local)
      let remote = null
      let docs = testUtils.makeDocs(5)
      let remoteURL, response

      remoteURL = await testUtils.createUser();
      const user1 = remoteURL.split(':')[1].substring(2);
      const access = {meta_access: ['u|'+user1,] };
      docs = docs.map(d =>{
        return {...d, ...access};
      });

      remote = new PouchDB(remoteURL)
      response = await remote.allDocs();
      assert.strictEqual(response.rows.length, 0)

      const res1 = await local.bulkDocs(docs);
      let t = await local.allDocs();
      await wait(500);
      local.replicate.to(remote);
      await wait(500)
      response = await remote.allDocs();
      assert.strictEqual(response.rows.length, docs.length)
    }
    catch(err){
      assert(false);
    }
  })

 
  it('pull replication', async () => {
    try{
      let local = new PouchDB(dbs.local)
      let docs = testUtils.makeDocs(5)
      let remoteURL, remote, response

      remoteURL = await testUtils.createUser();
      remote = new PouchDB(remoteURL)
      await remote.bulkDocs(docs)
      await wait(1000)
      local.replicate.from(remote)
      await wait(1000)
      response = await local.allDocs({ include_docs: true });
      assert.strictEqual(response.total_rows, docs.length)
    }
    catch(err){
      assert(false);
    }
  })

  it('multi-client replication', function () {
    var client1 = new PouchDB(dbs.local)
    var client2 = new PouchDB(dbs.secondary)
    var remote = null
    var docs = testUtils.makeDocs(5)

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return client1.bulkDocs(docs)
    }).then(function () {
      return client1.replicate.to(remote)
    }).then(function () {
      return client2.replicate.from(remote)
    }).then(function () {
      return client2.allDocs()
    }).then(function (response) {
      assert.strictEqual(response.total_rows, docs.length)
    })
  });


})
