/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var app = require('../app')

var PouchDB = require('pouchdb')

describe('POST /all_docs', function () {
  var docCount = 5
  var docs = null
  var docs2 = null
  var url1 = null
  var res1 = null
  var remote = null
  var remote2 = null

  const wait = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }
  

  before(async () => {
    // create two users, one who has 5 docs, the other 10, in the
    // the same database. Ensure that each user gets only their own data
    docs = testUtils.makeDocs(docCount)
    docs2 = testUtils.makeDocs(docCount * 2)
    let user1, user2, access1, access2;
    

    return testUtils.createUser().then((remoteURL) => {
      remote = new PouchDB(remoteURL)
      url1 = remoteURL.replace(/\/[a-z0-9]+$/, '')
      user1 = remoteURL.split(':')[1].substring(2);
      access1 = { meta_access:[ 'u|'+ user1 ] };
      console.log(user1);
      console.log(access1);
      docs = docs.map(d =>{
        return {...d, ...access1};
      });

      return remote.bulkDocs(docs)
    }).then(function (response) {
      res1 = response
      assert.strictEqual(response.length, docCount, response)
      response.forEach((row) => {
        assert(!row.error)
      })
      return testUtils.createUser()
    }).then(async (remoteURL2) => {
      user2 = remoteURL2.split(':')[1].substring(2);
      access2 = { meta_access:[ 'u|'+ user2 ] };
      docs2 = docs2.map(d =>{
        return {...d, ...access2};
      });

      remote2 = new PouchDB(remoteURL2)
      const res2  = await remote2.bulkDocs(docs2)
      return res2
    })
  })

  it('POST /db/_all_docs with no parameters', async () => {
    await wait(500);
    console.log('ALL DOCS POST TEST:::: ', url1);
    var cloudant = require('nano')(url1)
    var r = {
      method: 'post',
      db: app.dbName,
      path: '_all_docs'
    }
    try {
      const data = await cloudant.request(r);
      assert.strictEqual(typeof data, 'object')
      assert.strictEqual(typeof data.rows, 'object')
      assert.strictEqual(data.rows.length, docCount)
    
      data.rows.forEach(function (row) {
        assert.strictEqual(typeof row, 'object')
        assert.strictEqual(typeof row.id, 'string')
        assert.strictEqual(typeof row.key, 'string')
        assert.strictEqual(typeof row.value, 'object')
        assert.strictEqual(typeof row.doc, 'object')
        assert.strictEqual(row.id, row.key)
      })
    }
    catch(err){
      console.log(err);
      assert.strictEqual(err, null)
    }
  });

  it('POST /db/_all_docs with keys parameters', function (done) {
    var keys = []
    res1.forEach(function (row) {
      keys.push(row.id)
      assert(!row.error)
    })

    var cloudant = require('nano')(url1)
    var r = {
      method: 'post',
      db: app.dbName,
      path: '_all_docs',
      body: { keys: keys }
    }
    cloudant.request(r, function (err, data) {
      assert.strictEqual(err, null)
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
      done()
    })
  })
})
