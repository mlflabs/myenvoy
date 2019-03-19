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

describe('GET all_docs', function () {
  it('GET /db/_all_docs with no parameters', async () => {
    // create two users, one who has 5 docs, the other 10, in the
    // the same database. Ensure that each user gets only their own data
    let docCount = 5
    let docs = testUtils.makeDocs(docCount)
    let docs2 = testUtils.makeDocs(docCount * 2)
    let remote = null
    let remote2 = null
    let response, data;
    await wait(500);
    const remoteURL = await testUtils.createUser();
    remote = new PouchDB(remoteURL)
    response = await remote.bulkDocs(docs);
    wait(1000);
    assert.strictEqual(response.length, docCount, response)
    response.forEach(function (row) {
        assert(!row.error)
    });

    const remoteURL2 = await testUtils.createUser()
    remote2 = new PouchDB(remoteURL2)
    response = await remote2.bulkDocs(docs2);
    await wait(500);
    data = await remote.allDocs()

    assert.strictEqual(typeof data, 'object')
    assert.strictEqual(typeof data.rows, 'object')
    // feature not implemented, always defaults to 0
    assert.strictEqual(data.rows.length, docCount)
    data.rows.forEach(function (row) { 
        assert.strictEqual(typeof row, 'object')
        assert.strictEqual(typeof row.id, 'string')
        assert.strictEqual(typeof row.key, 'string')
        assert.strictEqual(typeof row.value, 'object')
        assert.strictEqual(typeof row.doc, 'undefined')
        assert.strictEqual(row.id, row.key)
    })
    
     
    data = await remote2.allDocs()
    assert.strictEqual(typeof data, 'object')
    assert.strictEqual(typeof data.rows, 'object')
    //not implmented, will always give you 0
    assert.strictEqual(data.rows.length, docCount * 2)
    data.rows.forEach(function (row) {
      assert.strictEqual(typeof row, 'object')
      assert.strictEqual(typeof row.id, 'string')
      assert.strictEqual(typeof row.key, 'string')
      assert.strictEqual(typeof row.value, 'object')
      assert.strictEqual(typeof row.doc, 'undefined')
      assert.strictEqual(row.id, row.key)
    })
    

  })

  it('GET /db/_bulk_docs with include_docs=true parameter', async () => {
    // create two users, one who has 5 docs, the other 10, in the
    // the same database. Ensure that each user gets only their own data
    let docCount = 5;
    let docs = testUtils.makeDocs(docCount);
    let docs2 = testUtils.makeDocs(docCount * 2);
    let remote = null;
    let remote2 = null;
    let response, data;

    let remoteURL = await testUtils.createUser();
    remote = new PouchDB(remoteURL)
    response = await remote.bulkDocs(docs)
    assert.strictEqual(response.length, docCount)
    response.forEach(function (row) {
        assert(!row.error)
    })

    let remoteURL2 = await testUtils.createUser();
    remote2 = new PouchDB(remoteURL2)
    response = await remote2.bulkDocs(docs2)
    
    // ensure we can retrieve what we inserted
    // not implemented
    await wait(500);
    data = await remote.allDocs({ include_docs: true })
    assert.strictEqual(typeof data, 'object')
    assert.strictEqual(typeof data.rows, 'object')
    assert.strictEqual(data.rows.length, docCount)
    data.rows.forEach(function (row) {
      assert.strictEqual(typeof row, 'object')
      assert.strictEqual(typeof row.id, 'string')
      assert.strictEqual(typeof row.key, 'string')
      assert.strictEqual(typeof row.value, 'object')
      assert.strictEqual(row.id, row.key)
      assert.strictEqual(typeof row.doc, 'object')
    })

    await wait(500);
    data = await remote2.allDocs({ include_docs: true })
    assert.strictEqual(typeof data, 'object')
    assert.strictEqual(typeof data.rows, 'object')
    assert.strictEqual(data.rows.length, docCount * 2)
    data.rows.forEach(function (row) {
      assert.strictEqual(typeof row, 'object')
      assert.strictEqual(typeof row.id, 'string')
      assert.strictEqual(typeof row.key, 'string')
      assert.strictEqual(typeof row.value, 'object')
      assert.strictEqual(row.id, row.key)
      assert.strictEqual(typeof row.doc, 'object')
    })

 
  })

  it('GET /db/_all_docs with keys parameters', async () => {
    let docCount = 5
    let docs = testUtils.makeDocs(docCount)
    let remote = null
    let data

    let remoteURL = await testUtils.createUser();
    remote = new PouchDB(remoteURL)
    let response = await remote.bulkDocs(docs)

    assert.strictEqual(response.length, docCount, response)
    var keys = []
    response.forEach(function (row) {
        keys.push(row.id)
        assert(!row.error)
    })

    // remove first two items from keys
    // we want to only ask for 3 docs
    keys.splice(0, 2)

    // ensure we can retrieve what we inserted
    data = await remote.allDocs({ keys: keys })
    assert.strictEqual(typeof data, 'object')
    assert.strictEqual(typeof data.rows, 'object')
    assert.strictEqual(data.rows.length, docCount - 2)
    data.rows.forEach(function (row) {
      assert.strictEqual(typeof row, 'object')
      assert.strictEqual(typeof row.id, 'string')
      assert.strictEqual(typeof row.key, 'string')
      assert.strictEqual(typeof row.value, 'object')
      assert.strictEqual(row.id, row.key)
        // it turns out PouchDB is actually calling POST /db/_all_docs
        // and Nano is adding include_docs: true whether you like it or not
        // https://github.com/dscape/nano/blame/master/lib/nano.js#L476
        // commenting this out for now
        // assert.strictEqual(typeof row.doc,'undefined');
      })
  })

  it('GET /db/_all_docs with keys and include_docs=true', function () {
    var docCount = 5
    var docs = testUtils.makeDocs(docCount)
    var remote = null

    return testUtils.createUser().then(function (remoteURL) {
      remote = new PouchDB(remoteURL)
      return remote.bulkDocs(docs)
    }).then(function (response) {
      assert.strictEqual(response.length, docCount, response)
      var keys = []
      response.forEach(function (row) {
        keys.push(row.id)
        assert(!row.error)
      })

      // remove first two items from keys
      // we want to only ask for 3 docs
      keys.splice(0, 2)

      // ensure we can retrieve what we inserted
      return remote.allDocs({ keys: keys, include_docs: true })
    }).then(function (data) {
      assert.strictEqual(typeof data, 'object')
      assert.strictEqual(typeof data.rows, 'object')
      assert.strictEqual(data.rows.length, docCount - 2)
      data.rows.forEach(function (row) {
        assert.strictEqual(typeof row, 'object')
        assert.strictEqual(typeof row.id, 'string')
        assert.strictEqual(typeof row.key, 'string')
        assert.strictEqual(typeof row.value, 'object')
        assert.strictEqual(row.id, row.key)
        assert.strictEqual(typeof row.doc, 'object')
      })

    })

    
  })
})
