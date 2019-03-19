const sqlite = require('better-sqlite3');
const access = require('../../access');

let db;

let insertChangeStmt;
let insertBulkChangesTransaction;
let selectChangesStmt;
let selectLatestStmt;

// create the database tables and indicies
const setup = (dbName) => {
  db = new sqlite(dbName+'.sqlite');

  //create db and run its indexes
  const createDBStmt = db.prepare('CREATE TABLE IF NOT EXISTS changes (change_id INTEGER PRIMARY KEY AUTOINCREMENT, seq_num, INTEGER, seq TEXT, user TEXT, id TEXT, changes TEXT, deleted BOOLEAN DEFAULT true)');
  const info = createDBStmt.run();
  const addIndexStmt = db.prepare('CREATE INDEX IF NOT EXISTS index_user ON changes (seq_num, user)');
  const info2 = addIndexStmt.run();

  const insertBulkSql = 'INSERT INTO changes ' +
              '(seq, seq_num, user, id, changes, deleted) VALUES ' +
              '($seq, $seq_num, $user, $id, $changes, $deleted)';
  
  insertChangeStmt = db.prepare(insertBulkSql);
  insertBulkChangesTransaction = db.transaction((changes) => {
    for (const change of changes) insertChangeStmt.run(change);
  });


  const selectChangesSql = 'SELECT seq, id,  changes, deleted from changes ' +
                           'where seq_num > $since AND ' +
                           'user = $user ' +
                           'ORDER BY change_id ASC LIMIT $limit'
  selectChangesStmt = db.prepare(selectChangesSql);


  const selectLatestSql = 'SELECT seq from changes ORDER BY seq_num DESC LIMIT 1';
  selectLatestStmt = db.prepare(selectLatestSql); 
}

// insert an array of changes into the changes database
// insert an array of changes into the changes database
const insertBulk = async (changes) => { 
  try {
    //lets prep changes into correct format
    //seq, seq_num, user, id, changes, deleted
    const formattedChanges = changes.map(change => {
      // extract the id of the user from the id of the document e.g. sue|abc123
      const user = access.extractOwnerId(change.id)
      const deleted = (change.deleted)? 1: 0;

      return {
        seq: change.seq,
        seq_num: parseInt(change.seq.split('-')[0]),
        user: user,
        id: access.removeOwnerId(change.id), // store the original document id,
        changes: JSON.stringify(change.changes),
        deleted: deleted
      };
    });
    const info = insertBulkChangesTransaction(formattedChanges);
    return info;
  }
  catch(err) {
    // if (!db.inTransaction) throw err; 
    console.log('Insert Bulk Error: ', err);
  }
}

// simulate a changes feed, segmented by user,
// given a 'since' and a 'user' and a 'limit'
const changes = (opts) => {
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

  const params = {
    since: opts.since,
    user: opts.user,
    limit: opts.limit
  }
  const changes = selectChangesStmt.all(params);

  const formatedChanges = changes.map(row => {
    let change =   {
      seq: row.seq,
      id: row.id,
      changes: JSON.parse(row.changes),
      user: row.user
    }
    if (row.deleted === 1) change.deleted = true;
    return change;
  });
  const changeResults = {
    results: formatedChanges,
    last_seq: formatedChanges[formatedChanges.length-1].seq,
    pending: 0
  }
  return changeResults;
}

// get the latest change from the changes feed database
const getLatest =  (opts) => {
  let since = '0'
  const row = selectLatestStmt.get();
  if (row) since = row.seq;
  return since;
}

module.exports = () => {
  return {
    setup,
    changes,
    insertBulk,
    getLatest
  };
}
