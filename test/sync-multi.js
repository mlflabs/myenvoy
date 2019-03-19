/* eslint-env mocha */
'use strict'
/* globals testUtils */

var PouchDB = require('pouchdb')

var assert = require('assert')

const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
// Generate a bunch of documents, and store those in a local
// PouchDB. Kick off a push replication, and then query remote
// end to ensure that all generated documents made it acrosss.
describe('two way sync', function () {
  var dbs = {}
  beforeEach(function (done) {
    
    dbs = { local: 'testdb', secondary: 'testdb2', third: 'third' }
    testUtils.cleanup([dbs.local, dbs.secondary, dbs.third], done)
  })

  afterEach(function (done) {
    testUtils.cleanup([dbs.local, dbs.secondary, dbs.third], done)
  })





  it('Test project permissions', async () => {
    const client1 = new PouchDB(dbs.local)
    const client2 = new PouchDB(dbs.secondary)
    const client3 = new PouchDB(dbs.third);

    var remote = null

    const remoteURL1 = await testUtils.createUser();
    const remoteURL2 = await testUtils.createUser();
    

    const user1 = remoteURL1.split(':')[1].substring(2);
    const user2 = remoteURL2.split(':')[1].substring(2);

    const remoteURL3 = await testUtils.createUser(1, 
      { meta_access: { ['u|'+ user2 + '|4']:{r: true, w: true}}});
    const user3 = remoteURL3.split(':')[1].substring(2);


    

    const mike = { name: 'mike', channels: {}};
    const test = { name: 'test', channels: {}};
    const test2 = { name: 'test2', channels: {}};

    const docs1 = [
      {_id: 'p|pi|1', "meta_access": ["u|"+user1+"|1"]},
      {_id: 'p|pi|2', "meta_access": ["u|"+user1+"|2"]},
      {_id: 'p|pi|3', "meta_access": ["u|"+user1+"|3"]},

      {_id: 'p|1|t|1', "meta_access": ["u|"+user1+"|1"]},
      {_id: 'p|1|t|2', "meta_access": ["u|"+user1+"|1"]},
      {_id: 'p|1|t|3', "meta_access": ["u|"+user1+"|1"]},
      {_id: 'p|2|t|4', "meta_access": ["u|"+user1+"|2"]},
      {_id: 'p|2|t|5', "meta_access": ["u|"+user1+"|2"]},
      {_id: 'p|2|t|6', "meta_access": ["u|"+user1+"|2"]},
      {_id: 'p|3|t|7', "meta_access": ["u|"+user1+"|3"]},
    ];
    const docs2 = [
      {_id: 'p|pi|4', "meta_access": ["u|"+user2+"|4"]},
      {_id: 'p|pi|5', "meta_access": ["u|"+user2+"|5"]},

      {_id: 'p|4|t|8', "meta_access": ["u|"+user2+"|4"]},
      {_id: 'p|5|t|9', "meta_access": ["u|"+user2+"|5"]},
      {_id: 'p|5|t|01', "meta_access": ["u|"+user2+"|5"]},
    ];

    const docs3 = [
      {_id: 'p|pi|6', "meta_access": ["u|"+user3+"|6"]},

      {_id: 'p|6|t|2', "meta_access": ["u|"+user3+"|6"]},
    ]

    let remote1 = new PouchDB(remoteURL1)
    let remote2 = new PouchDB(remoteURL2)
    let remote3 = new PouchDB(remoteURL3)

    let response1 = await remote1.allDocs();
    let response2 = await remote2.allDocs();
    let response3 = await remote3.allDocs();

    assert.strictEqual(response1.rows.length, 0)
    assert.strictEqual(response2.rows.length, 0)
    assert.strictEqual(response3.rows.length, 0)

    let res1 = await client1.bulkDocs(docs1);
    let res2 = await client2.bulkDocs(docs2);
    let res3 = await client3.bulkDocs(docs3);
    await wait(1000);
    client1.replicate.to(remote1);
    client2.replicate.to(remote2);
    client3.replicate.to(remote3);
    await wait(500);
    let response11 = await remote1.allDocs();
    let response22 = await remote2.allDocs();
    let response33 = await remote3.allDocs();

    assert.equal(res1.length, response11.rows.length);
    assert.equal(res2.length, response22.rows.length);

    //this should have its own and 2 from user2 p4 
    assert.equal(res3.length+2, response33.rows.length);

  });

  it('ensure no conflicts arise for push pull sync', async () => {
    try{
      var local = new PouchDB(dbs.local)
      var docs = testUtils.makeDocs(5)

      let remoteURL = await testUtils.createUser();
      let remote = await new PouchDB(remoteURL);
      let response = await remote.allDocs();

      assert.strictEqual(response.rows.length, 0)
      await local.bulkDocs(docs);
      await remote.replicate.to(local);
      await wait(1000)
      let data = await local.allDocs({ conflicts: true });

      data.rows.forEach(function (row) {
      assert.strictEqual(typeof row._conflicts, 'undefined')
    })
    }catch(err){
      assert(false);
    }

    

    
  })

  it('ensure no conflicts arise for pull push sync', async () => {
    try {
      var local = new PouchDB(dbs.local)
      var docs = testUtils.makeDocs(5)
  
      let remoteURL = await testUtils.createUser();
      let remote = await new PouchDB(remoteURL);
      let response = await remote.allDocs();
      assert.strictEqual(response.rows.length, 0)
      await remote.bulkDocs(docs)
      await wait(1000)
      await remote.replicate.to(local)
      await wait(1000)
      // Verify that all documents reported as pushed are present
      // on the remote side.
      return local.replicate.to(remote)
      await wait(1000)
      remote.allDocs({ conflicts: true });
  
      data.rows.forEach(function (row) {
        assert.strictEqual(typeof row._conflicts, 'undefined')
      })  
    }catch(err){
      assert(false);
    }
  });


})

