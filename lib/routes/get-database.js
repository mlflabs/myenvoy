const express = require('express')
const router = express.Router()
const app = require('../../app')
const auth = require('../auth')


/*

5.2.2.2.1. Get Source Information
Request:

GET /source HTTP/1.1
Accept: application/json
Host: localhost:5984
User-Agent: CouchDB
Response:

HTTP/1.1 200 OK
Cache-Control: must-revalidate
Content-Length: 256
Content-Type: application/json
Date: Tue, 08 Oct 2013 07:53:08 GMT
Server: CouchDB (Erlang OTP)

{
    "committed_update_seq": 61772,
    "compact_running": false,
    "data_size": 70781613961,
    "db_name": "source",
    "disk_format_version": 6,
    "disk_size": 79132913799,
    "doc_count": 41961,
    "doc_del_count": 3807,
    ******* "instance_start_time": "0", -- legacy, must always be 0
    "purge_seq": 0,
    "update_seq": 61772
}


5.2.2.2.2. Get Target Information
Request:

GET /target/ HTTP/1.1
Accept: application/json
Host: localhost:5984
User-Agent: CouchDB
Response:

HTTP/1.1 200 OK
Content-Length: 363
Content-Type: application/json
Date: Tue, 08 Oct 2013 12:37:01 GMT
Server: CouchDB (Erlang/OTP)

{
    "compact_running": false,
    "db_name": "target",
    "disk_format_version": 5,
    "disk_size": 77001455,
    "doc_count": 1832,
    "doc_del_count": 1,
    "instance_start_time": "0",
    "other": {
        "data_size": 50829452
    },
    "purge_seq": 0,
    "update_seq": "1841-g1AAAADveJzLYWBgYMlgTmGQT0lKzi9KdUhJMtbLSs1LLUst0k"
}







{"db_name":"jwttest",
******* "update_seq":"0-g1AAAABXeJzLYWBgYMpgTmEQTM4vTc5ISXLIyU9OzMnILy7JAUklMiTV____PyuRAY-iPBYgydAApP5D1GYBAJmvHGw",
"sizes":{"file":4453,"external":0,"active":222},
"purge_seq":0,
"other":{"data_size":0},
"doc_del_count":0,
"doc_count":0,
"disk_size":4453,
"disk_format_version":6,
"data_size":222,
"compact_running":false,
"cluster":{"q":2,"n":1,"w":1,"r":1},"instance_start_time":"0"}



{"db_name":"jwttest",
"update_seq":"2-g1AAAABXeJzLYWBgYMpgTmEQTM4vTc5ISXLIyU9OzMnILy7JAUklMiTV____
PyuREY-iPBYgydAApP5D1GYBAJnfHG4",
"sizes":{"file":20840,
"external":210,
"active":1248},
"purge_seq":0,
"other":{"data_size":210},
"doc_del_count":0,
"doc_count":2,"disk_size":20840,
"disk_format_version":6,
"data_size":1248,
"compact_running":false,
cluster":{"q":2,"n":1,"w":1,"r":1},
"instance_start_time":"0"}


*/

router.get('/' + app.dbName, auth.isAuthenticated, (req, res) => {
  app.db.info().then((data) => {
    res.send(data)
  })
})

module.exports = router
