
const app = require('../app')
const ChangesReader = require('changesreader')
const changesdb = require('./changesdb.js')
let changesReader = null

// process each array of changes
const processBatch = (b) => {
  changesdb.processBatch(b).catch(console.error)
} 

const extractSequenceNumber = (seq) => {
  return parseInt(seq.replace(/-.*$/, ''))
}


const spool = (callback) => {
  // use a fresh Nano object and the ChangesReader library
  changesReader = new ChangesReader(app.dbName, app.cloudant.request)
  let lastSeq = 0

  // return a Promise
  return new Promise((resolve, reject) => {

    //get our last sync id
    lastSeq =  changesdb.getLatestGlobalChangeSeq();
    let total = 0
    changesReader.spool({ since: lastSeq, includeDocs: true })
        .on('batch', (b) => {
          total += b.length
          processBatch(b)
          const latest = b[b.length - 1]
          const thisSeq = extractSequenceNumber(latest.seq)
          app.spoolChangesProgress = Math.floor(100 * thisSeq / lastSeq)
          process.stdout.write('  ' + total + ' (' + app.spoolChangesProgress + '%)\r')
        })
        .on('end', (lastSeq) => {
          // all done
          app.spoolChangesProgress = 100
          process.stdout.write('\n')
          resolve(lastSeq);
        })
        .on('error', (e) => {
          // something bad happened, such as could not log in.
          reject(new Error('changes feed spooling failed'))
        })
    });//end promise
}

// monitor changes from 'now'
const start = async (since) => {
  const seq = await changesdb.getLatestGlobalChangeSeq();
  changesReader = new ChangesReader(app.dbName, app.cloudant.request)
  changesReader.start({ since: since, includeDocs:true }).on('batch', processBatch)
}

module.exports = {start, spool };
