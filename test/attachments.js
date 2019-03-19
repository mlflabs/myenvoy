/* eslint-env mocha */
'use strict'
/* globals testUtils */

var assert = require('assert')

var PouchDB = require('pouchdb')

var ATT_TXT = Buffer.from('abc').toString('base64')

var ATT_TXT2 = Buffer.from('Hello World').toString('base64')

var localBob = null

var remoteBob = null

describe('CRUD', function () {
  var dbs = { local: 'testdb', secondary: 'testdb2' }

  it('test cleanup', function (done) {
    testUtils.cleanup([dbs.local, dbs.secondary], function () {
      localBob = new PouchDB(dbs.local)
      done()
    })
  })

  it('create user', function () {
    return testUtils.createUser(2).then(function (urls) {
      remoteBob = new PouchDB(urls[0])
    })
  })

  it('create an attachment and replicate it', async () => {
    try{
      const data = await localBob.putAttachment('mydoc', 'att.txt', ATT_TXT, 'text/plain');
      assert.strictEqual(typeof data, 'object')
      await localBob.replicate.to(remoteBob, (err, data) =>{
        if(data.ok)
          assert(true)

        assert(false);
      });
      
    }
    catch(err) {
      assert(false)
    }
  })

  it('replicate attachment back again', async () => {
    try{
      const d = localBob.replicate.from(remoteBob, async (data)=>{
        data = await localBob.get('mydoc');
        assert.strictEqual(typeof data, 'object')
        assert.strictEqual(typeof data._attachments, 'object')
        assert.strictEqual(typeof data._attachments['att.txt'], 'object')
        assert.strictEqual(data._attachments['att.txt'].content_type, 'text/plain')
      });
    }
    catch(err){
      assert(false)
    }
  })

  it('fetch attachment from the server', async () => {
    try{
      remoteBob.getAttachment('mydoc', 'att.txt').then(data=>{
        data = data.toString('utf8')
        assert.strictEqual(data, 'abc')
      });
      
    }
    catch(err){
      assert(false)
    }
  })

  it('update an attachment from the server', async () => {
    try{
      let d = await remoteBob.get('mydoc');
      d = await remoteBob.putAttachment('mydoc', 'att.txt', d._rev, ATT_TXT2, 'text/plain')
      assert.strictEqual(typeof d, 'object')
      assert.strictEqual(d.id, 'mydoc')
      assert.strictEqual(typeof d.rev, 'string')
      assert.strictEqual(d.ok, true)

    }
    catch(err){
      assert(false)
    }

  })

  it('delete an attachment from the server', function () {
    return remoteBob.get('mydoc').then(function (data) {
      return remoteBob.removeAttachment('mydoc', 'att.txt', data._rev)
    }).then(function (data) {
      assert.strictEqual(typeof data, 'object')
      assert.strictEqual(data.id, 'mydoc')
      assert.strictEqual(typeof data.rev, 'string')
      assert.strictEqual(data.ok, true)
    }).catch(function (e) {
      // shouldn't get here
      assert(false)
    })
  })
})
