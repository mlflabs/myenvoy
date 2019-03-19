const ms = () => {
  return new Date().getTime() / 1000
}

const envoy = require('.')()
const PouchDB = require('pouchdb')
let local = new PouchDB('local')
const url = 'http://user1:password@localhost:' + process.env.PORT + '/' + process.env.ENVOY_DATABASE_NAME
const remote = new PouchDB(url)
let start = ms()

envoy.events.on('listening', function () {
  console.log('Startup took', ms() - start, 's')
  local.destroy().then(() => {
    local = new PouchDB('local')
    start = ms()
    return local.replicate.from(remote, { checkpoint: false })
  }).then(function (info) {
    console.log(info)
    console.log('Replication 1 from', process.env.USERCOUNT, 'users took', ms() - start, 's')
    start = ms()
    return local.replicate.from(remote, { checkpoint: false })
  }).then((info) => {
    console.log('Replication 2 from', process.env.USERCOUNT, 'users took', ms() - start, 's')
    return local.destroy()
  }).then(() => {
    process.exit(0)
  })
})
