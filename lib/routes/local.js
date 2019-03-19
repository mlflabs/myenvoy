const express = require('express')
const router = express.Router()
const auth = require('../auth')
const utils = require('../utils')
const access = require('../access')
const app = require('../../app')
const changesdb = require('../changesdb.js')

//for testing
const diff = require('deep-diff');


//{"error":"not_found","reason":"missing"}
//{"error":"internal_server_error","reason":"server error"}

/*

Request:

GET /source/_local/b3e44b920ee2951cb2e123b63044427a HTTP/1.1
Accept: application/json
Host: localhost:5984
User-Agent: CouchDB
Response:

HTTP/1.1 200 OK
Cache-Control: must-revalidate
Content-Length: 1019
Content-Type: application/json
Date: Thu, 10 Oct 2013 06:18:56 GMT
ETag: "0-8"
Server: CouchDB (Erlang OTP)

{
    "_id": "_local/b3e44b920ee2951cb2e123b63044427a",
    "_rev": "0-8",
    "history": [
        {
            "doc_write_failures": 0,
            "docs_read": 2,
            "docs_written": 2,
            "end_last_seq": 5,
            "end_time": "Thu, 10 Oct 2013 05:56:38 GMT",
            "missing_checked": 2,
            "missing_found": 2,
            "recorded_seq": 5,
            "session_id": "d5a34cbbdafa70e0db5cb57d02a6b955",
            "start_last_seq": 3,
            "start_time": "Thu, 10 Oct 2013 05:56:38 GMT"
        },
        {
            "doc_write_failures": 0,
            "docs_read": 1,
            "docs_written": 1,
            "end_last_seq": 3,
            "end_time": "Thu, 10 Oct 2013 05:56:12 GMT",
            "missing_checked": 1,
            "missing_found": 1,
            "recorded_seq": 3,
            "session_id": "11a79cdae1719c362e9857cd1ddff09d",
            "start_last_seq": 2,
            "start_time": "Thu, 10 Oct 2013 05:56:12 GMT"
        },
        {
            "doc_write_failures": 0,
            "docs_read": 2,
            "docs_written": 2,
            "end_last_seq": 2,
            "end_time": "Thu, 10 Oct 2013 05:56:04 GMT",
            "missing_checked": 2,
            "missing_found": 2,
            "recorded_seq": 2,
            "session_id": "77cdf93cde05f15fcb710f320c37c155",
            "start_last_seq": 0,
            "start_time": "Thu, 10 Oct 2013 05:56:04 GMT"
        }
    ],
    "replication_id_version": 3,
    "session_id": "d5a34cbbdafa70e0db5cb57d02a6b955",
    "source_last_seq": 5
}
The Replication Log SHOULD contain the following fields:

history (array of object): Replication history. Required
doc_write_failures (number): Number of failed writes
docs_read (number): Number of read documents
docs_written (number): Number of written documents
end_last_seq (number): Last processed Update Sequence ID
end_time (string): Replication completion timestamp in RFC 5322 format
missing_checked (number): Number of checked revisions on Source
missing_found (number): Number of missing revisions found on Target
recorded_seq (number): Recorded intermediate Checkpoint. Required
session_id (string): Unique session ID. Commonly, a random UUID value is used. Required
start_last_seq (number): Start update Sequence ID
start_time (string): Replication start timestamp in RFC 5322 format
replication_id_version (number): Replication protocol version. Defines Replication ID calculation algorithm, HTTP API calls and the others routines. Required
session_id (string): Unique ID of the last session. Shortcut to the session_id field of the latest history object. Required
source_last_seq (number): Last processed Checkpoint. Shortcut to the recorded_seq field of the latest history object. Required



This request MAY fall with a 404 Not Found response:

Request:

GET /source/_local/b6cef528f67aa1a8a014dd1144b10e09 HTTP/1.1
Accept: application/json
Host: localhost:5984
User-Agent: CouchDB
Response:

HTTP/1.1 404 Object Not Found
Cache-Control: must-revalidate
Content-Length: 41
Content-Type: application/json
Date: Tue, 08 Oct 2013 13:31:10 GMT
Server: CouchDB (Erlang OTP)

{
    "error": "not_found",
    "reason": "missing"
}

--------- 




{"_id":"_local/0cSoWteqZHKqaQP6DGbY1A==",
"_rev":"0-1",
"session_id":"ad732940-4158-4499-823d-76f950a141b4",
"history":[{"last_seq":0,"session_id":"ad732940-4158-4499-823d-76f950a141b4"}],
"replicator":"pouchdb","version":1,"last_seq":0}



{"_id":"_local/0cSoWteqZHKqaQP6DGbY1A==",
"_rev":"0-2",
"session_id":"c181867a-0def-4e1b-83fd-14c913546b9e",
"history":[{"last_seq":1,
"session_id":"c181867a-0def-4e1b-83fd-14c913546b9e"},
{"last_seq":0,
"session_id":"ad732940-4158-4499-823d-76f950a141b4"}],
"replicator":"pouchdb",
"version":1,
"last_seq":1}
*/


router.get('/' + app.dbName + '/_local/:key', auth.isAuthenticated, async (req, res) => {
  try{
    const key = req.params.key;
    const user = req.session.user.name;
    //const rec = await changesdb.getSyncUserKey('local|'+user+'|'+key);
    //if(rec.ok) {
      //console.log("LOCAL OK", rec);
      // return res.send(rec.res.doc);
    //}
    //else {
      //console.log("LOCAL ERR", rec);
      /*return res.status(rec.error.statusCode).send({
        error: rec.error.error,
        reason: rec.error.reason
      });*/
    //}

    const couchres = await app.cloudant.request({
      db: app.dbName,
      path: '_local/' +req.session.user.name +"|"+ req.params.key
      // TODO: path: access.addOwnerId('_local/' + req.params.key, req.session.user.name)
    });

    //console.log('Comparing', rec.res.doc, couchres);
    //const diffres = diff(rec.res.doc, couchres);
    //console.log('Differences', diffres);
    const formated = Object.assign(couchres, {_id: '_local/'+key});
    res.send(access.strip(formated))
  
    
  
  }
  catch (err){
    //console.log(err);
    return utils.sendError(err, res);
  }
});

/*
{"ok":true,"id":"_local/0cSoWteqZHKqaQP6DGbY1A==","rev":"0-1"}
{"ok":true,"id":"_local/0cSoWteqZHKqaQP6DGbY1A==","rev":"0-2"}
*/


router.put('/' + app.dbName + '/_local/:key', auth.isAuthenticated, async (req, res) => {
  try{
    const key = req.params.key;
    const user = req.session.user.name;
    const body = req.body;
    const originalid = '_local/'+key;
    //const rec = await changesdb.saveSyncUserKey('local|'+user+'|'+key, body);
    //console.log('LOCAL PUT: ', body);
    //if(rec.ok){
      //res.send({id:'_local/'+key, ok:true, rev:body._rev });  
    //}
    //else {
      //console.log('else');
      //return utils.sendError(rec.error, res)
    //}

    const couchres = await app.cloudant.request({
      db: app.dbName,
      path: '_local/' +req.session.user.name +"|"+ req.params.key, 
      method: 'PUT',
      body: req.body
    })
    //const local = {id:'_local/'+key, ok:true, rev:body._rev };
    // console.log('Comparing: ', local, couchres)
    // const diffres = diff(local, couchres);
    // console.log('Differences', diffres);

    //we need to strip off user data
    const formated = Object.assign(couchres, {id: originalid});
    return res.send(formated)

  }
  catch(err){
    return utils.sendError(err, res)
  }
});



router.get('/3' + app.dbName + '/_local/:key', auth.isAuthenticated, (req, res) => {
  app.cloudant.request({
    db: app.dbName,
    path: access.addOwnerId('_local/' + req.params.key, req.session.user.name)
  }, (err, data) => {
    if (err) {
      return utils.sendError(err, res)
    }
    console.log('get _local', access.strip(data));
    res.send(access.strip(data))
  })
})

router.put('/3' + app.dbName + '/_local/:key', auth.isAuthenticated, (req, res) => {
  app.cloudant.request({
    db: app.dbName,
    path: access.addOwnerId('_local/' + req.params.key, req.session.user.name),
    method: 'PUT',
    body: req.body
  }, (err, data) => {
    if (err) {
      return utils.sendError(err, res)
    }
    console.log('put _local', access.strip(data));
    res.send(access.strip(data))
  })
})

module.exports = router
