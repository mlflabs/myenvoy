level = require('level')
const access = require('../../access');

let changesdb;
let docdb;
let settingsdb;

const LAST_SEQ = 'last_seq';
const DIVIDER = '|';

// create the database tables and indicies
const setup = (dbName) => {
  console.log('-- ChangesDB: Level Setup');
  changesdb = level(dbName+'_changes');
  changesdb.on('put', function (key, value) {
    console.log('------- changesdb -- on inserted', { key, value })
  });
  changesdb.on('batch', function (res) {
    console.log('------- changesdb -- on batch', res.length);
  });

  console.log('-- ChangesDB: Level Setup');
  docdb = level(dbName+'_docs');
  docdb.on('put', function (key, value) {
    console.log('------- docdb -- on inserted', { key, value })
  });
  docdb.on('batch', function (res) {
    console.log('------- docdb -- on batch', res.length);
  });

  console.log('-- ChangesDB: Level Setup');
  settingsdb = level(dbName+'_settings');
  settingsdb.on('put', function (key, value) {
    console.log('------- settingsdb -- on inserted', { key, value })
  });
  settingsdb.on('batch', function (res) {
    console.log('------- settingsdb -- on batch', res.length);
  });




}

const processBatch = async (changes) => {
  console.log('-- ChangesDB: processBulk');  
  try {
    await insertBulk(changes);
    return true;
  }
  catch(err){
    console.log(err);
    return false;
  }

  
}

const insertBulk = async (changes) => {
  console.log('-- ChangesDB: changesInsertBulk');   
  try {

    const batcharray = [];

    changes.forEach(change => {
      const users = access.extractParticipants(change.doc);
      const deleted = (change.deleted)? 1: 0;
      const seq_num = parseInt(change.seq.split('-')[0]);

      users.forEach(user => {
        //changes docs, make one for each user
        batcharray.push({ type: 'put',
        key:  'change|'+user+DIVIDER+seq_num,
        value: JSON.stringify({
              seq: change.seq,
              user: user,
              id: change.id, // store the original document id,
              changes: change.changes,
              deleted: deleted
        })});
      })

      //cache docs
      batcharray.push( {
        type: 'put',
        key: 'doc'+DIVIDER+change.doc._id,
        value: JSON.stringify(change.doc)
      })

    });

    batcharray.push({
      type: 'put',
      key: LAST_SEQ,
      value: changes[changes.length-1].seq
    });

    await changesdb.batch(batcharray);

    return true;
  }
  catch(err) {
    // if (!db.inTransaction) throw err; 
    console.log('Insert Bulk Error: ', err);
    return false;
  }
}




// insert an array of changes into the changes database
const docsInsertBulk = async (docs) => { 
  console.log('-- ChangesDB: docInsertBulk');   
  try {
    const batcharray = docs.map(row => {
      return {
        type: 'put',
        key: 'doc'+DIVIDER+row.doc._id,
        value: JSON.stringify(row.doc)
      };
    })
    await docdb.batch(batcharray);
    return true;
  }
  catch(err) {
    // if (!db.inTransaction) throw err; 
    console.log('Insert DocBulk Error: ', err);
    return false;
  }
}




const loadChangesFromLevel = (opts) => {
  return new Promise((resolve, reject) => {
    let res = [];
    //using gte, so we are including the first element as match
    changesdb.createValueStream({ gte: opts.user+DIVIDER+opts.since, lte: opts.user+DIVIDER+'z', limit: opts.limit })
      .on('data', (data) => {
          res.push(JSON.parse(data));
      })
      .on('error', err => {
        console.log('LEVEL Read error: ', err);
        return [];
      })
      .on('end', (data) => {
        console.log('END: ', data);
        return resolve(res);
      });
  });//end of promise
}




// simulate a changes feed, segmented by user,
// given a 'since' and a 'user' and a 'limit'
const changes = async (opts) => {
  try {
    console.log('-- ChangesDB: Changes'); 

    if (typeof opts.since === 'undefined') { 
      opts.since = 0
    } else {
      const bits = opts.since.split('-')
      if (bits.length > 0) {
        opts.since = parseInt(bits[0])
      } else {
        opts.since = 0
      }
    }

    if (typeof opts.limit === 'undefined') {
      opts.limit = 100
    }

    console.log('OPTS: ', opts);
    
    const res = await loadChangesFromLevel(opts);

    console.log('RES: ', res);
    

    const seq = (res.length > 0)? res[res.length-1].seq : 0;
    //we also need to shift first element, since it will be duplicate
    res.shift();

    const changeResults = {
      results: res,
      last_seq: seq,
      pending: 0
    }

    console.log('selected changes:: ');
    console.log(changeResults);
    return changeResults;
  }
  catch(err){
    console.log(err);
  }
    

}


// get the latest change from the changes feed database
const getSyncUserKey =  async (key) => {
  console.log('-- ChangesDB: getSyncUserKey'); 
  try{
    const row = await changesdb.get(key);
    return row
  }
  catch(err){
    if(err.type === 'NotFoundError') 
      console.log('getSyncUserKey not found, must be new sync');
    else 
      console.log('getLatest: ', err);
  }
  return null;
}

// get the latest change from the changes feed database
const getLatestGlobalChangeSeq =  async (opts) => {
  console.log('-- ChangesDB: GetLatest'); 
  let since = 0;
  try{
    const row = await changesdb.get(LAST_SEQ);
    since = row;
    console.log('Since: ', since);
  }
  catch(err){
    if(err.type === 'NotFoundError') 
      console.log('Last_Seq not found, must be new setup');
    else 
      console.log('getLatest: ', err);
  }
  return since;
}

module.exports = () => {
  return {
    setup,
    //changs
    changes,
    getLatestGlobalChangeSeq,

    //settings
    getSyncUserKey,

    //process
    processBatch
  };
}
