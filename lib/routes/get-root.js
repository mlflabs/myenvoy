const express = require('express')
const router = express.Router()
const app = require('../../app')
const request = require('request')


/*
HTTP/1.1 200 OK
Request:

HEAD /target HTTP/1.1
Host: localhost:5984
User-Agent: CouchDB
Response:

HTTP/1.1 200 OK
Cache-Control: must-revalidate
Content-Type: application/json
Date: Sat, 05 Oct 2013 08:51:11 GMT
Server: CouchDB (Erlang/OTP)


*/


router.get('/', (req, res) => {
  // TODO: need to show that this is a custom build
  // user needs to know its not a full couchdb 
  request(app.serverURL).pipe(res)
})

module.exports = router
