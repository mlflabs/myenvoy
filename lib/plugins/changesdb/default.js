// const Nano = require('nano')
const access = require('../../access');
const app = require('../../../app.js')
// const nano = Nano(app.opts.couchHost)
const result = (ok=true, res=null, error = null, opts=null) => {
  return { ok, res, error, opts };
};

let db;
const LAST_SEQ = 'last_seq';
const DIV = '||';
const LASTCHAR = String.fromCharCode(65535); // 'z';

const printUserUniqueChannel = (username, channel, last=false) =>{
  if(last) return 'U|' + username + DIV + LASTCHAR;
  return 'U|' + username + DIV + channel;
};

const printChangeChannelId = (channel, seq = null, last=false) =>{
  if(seq){
    return 'change'+DIV+channel+DIV+seq;
  }
  let id = 'change'+DIV+channel + DIV;
  if(last)
    id=id+LASTCHAR;
  return id;
}

const printChannelId = (channel, id=null, rev=null, last=false) => {
  if(id && rev){
    return 'channel'+DIV+channel+DIV+id+DIV+rev;
  }
  let x = 'channel'+DIV+channel+DIV
  if(last)
    x = x+ LASTCHAR;

  return x;
  
}
const printDocRevId = (id, rev = null, last = false, ) => {
  //'doc'+DIV+change.doc._id+DIV+change.doc._rev
  if(rev){
    return 'doc'+DIV+id+DIV+rev;
  }

  let x = 'doc'+DIV+id+DIV;

  if(last) x = x+ LASTCHAR;

  return x;
}


// create the database tables and indicies
const setup = (dbName)=> {
  return new Promise((resolve, reject) => {
    app.cloudant.db.create(app.dbName+'_changes', (err, body, header) => {
      // 201 response == created
      // 412 response == already exists
      if (err || (header.statusCode !== 201 && header.statusCode !== 412)) {
        if(err.statusCode !== 201 && err.statusCode != 412)
          console.log(err || body)      
      }
      else {
        console.log( '[OK]  Created changes couch database: ' + dbName);
      }
      db = app.cloudant.db.use(app.dbName+'_changes');
      return resolve(true);
    });
  });
}



const processBatch = async (changes) => {
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
  try {

    const docs = [];
    const userChannels = {};

    changes.forEach(change => {
      const channels = access.extractChannels(change.doc);

      const deleted = (change.deleted)? 1: 0;
      const seq_num = parseInt(change.seq.split('-')[0]);

      const docids = [];
      
      // console.log('Channels');
      // console.log(channels);
      if(!Array.isArray(channels)) return;

      channels.forEach(channel => {
        //do we have a user channel if so add to userchannels
        const username = access.extractUsernameFromChannel(channel);
        if(username){
          userChannels[printUserUniqueChannel(username, channel)] = true;
        }
        //changes docs, make one for each user
        const id = printChangeChannelId(channel,seq_num);
        docids.push(id);
        docs.push({
              _id: id,
              seq: change.seq,
              id: change.id, // store the original document id,
              changes: change.changes,
              deleted: deleted
        });

        //TODO: here we could have another process to go over these docs and remove 
        // duplicates
        docs.push({
          _id: printChannelId(channel, change.id, change.doc._rev)
          //_id:'channel'+DIV+channel+DIV+change.id+DIV+change.doc._rev
        });

        //need to keep track of all unique user channels

      });

      //need 
      docs.push({
        _id: printDocRevId(change.doc._id, change.doc._rev),
        //_id: 'doc'+DIV+change.doc._id+DIV+change.doc._rev, 
        [app.opts.accessMetaKey]: change.doc[app.opts.accessMetaKey],
      }); 

      // TODO: cache docs, less stress on couchdb
      //docs.push({_id: 'doc'+DIV+change.doc._id, doc: change.doc});
    });

    docs.push({_id: LAST_SEQ, seq: changes[changes.length-1].seq})
    
    const res = await db.bulk({docs: docs});

    // save unique channels for each user
    const userChannelsArray = Object.keys(userChannels);

    userChannelsArray.forEach(c => {
        db.insert({_id: c}, (err, body)=>{
          // console.log('Insert', err, body);
        });
    });


    return true;
  }
  catch(err) {
    // if (!db.inTransaction) throw err; 
    console.log('Insert Bulk Error: ', err);
    return false;
  }
}

/*
Required:
  opts._id
*/
const loadDocRevisions = async (opts) => {
  try {
    const q = {
      selector: {
        '_id': {
            //'$gte': 'doc'+DIV+opts._id+DIV,
            '$gte': printDocRevId(opts._id, null, false),
            //'$lte': 'doc'+DIV+opts._id+DIV+'z', //TODO: find the last char code should be more encopasing
            '$lte': printDocRevId(opts._id, null, true)
        
          },
        },
      sort: [{ _id: 'desc' }],
       'limit': Number(opts.limit || 1000)
    };
    const res = await db.find(q);
    return result(true, res.docs);
  }
  catch(err){
    console.log(err);
    return false;
  }
}

//how many revisions back to keep
const cleanChangesDatabase = async (history_size=10) =>{
  //TODO:
}

function uniq(a) {
  var seen = {};
  return a.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}


const getAllUserChannels = async (user) =>{
  const c = access.extractUserChannels(user);
  let channels = [];
  try {
    const q = {
      selector: {
        '_id': {
          '$gte': printUserUniqueChannel(user.name, ''),
          '$lte': printUserUniqueChannel(user.name, '', true )
          },
        },
       // 'limit': Number(opts.limit||1000)
    };
    const res = await db.find(q);
    channels = res.docs.map(doc => doc._id.split('||')[1]);

  }
  catch(e) {
    console.log(e);
  }

  channels = uniq(c.concat(channels));
  return channels;
}

const loadChangesFromCouch = async (user, since = null, limit) => {
  try {
    const channels = await getAllUserChannels(user);
    let changes = [];
    for(let i = 0; i < channels.length; i++){
      const q = {
        selector: {
          '_id': {
            '$gte': printChangeChannelId(channels[i], since),
            //'change'+DIV+'user'+DIV+opts.user+DIV+opts.since,
            '$lte': printChangeChannelId(channels[i], null, true), 
            // '$lte': 'change'+DIV+'user'+DIV+opts.user+DIV+'z', 
            //TODO: find the last char code should be more encopasing
            },
          },
         'limit': Number(limit)
      };
      const res = await db.find(q);
      changes = changes.concat(res.docs);
    }

    //lets order the docs by seq;
    //TODO
    changes.sort((a,b)=>{
      aa = a.seq.split('-')[0];
      bb = b.seq.split('-')[0];
      return aa - bb;
    });

    return changes;
  }
  catch(err){
    console.log(err);
    return false;
  }


}

//load doc keys by user
/* no more user access, its all channels now 
const getDocKeysByUsername = async (username, opts={}) => {
  try {
    const keys = {}; 
    const q = {
      selector: {
        '_id': {
          '$gte': 'user'+DIV+username+DIV,
          '$lte': 'user'+DIV+username+DIV+'z', //TODO: find the last char code should be more encopasing
          },
        },
       'limit': Number(opts.limit||1000)
    };
    const res = await db.find(q);
    res.docs.forEach(doc=>{
      //remove duplicate docs with different revs
      keys[doc._id.split('||')[2]] = null;
    })
    return keys;

  }
  catch(err){
    console.log(err);
    return false;
  }
}
*/



//load doc keys by multiple channels
const getDocKeysByChannels = async (channels, opts={}) => {
  try {
    const _channels = Array.isArray(channels)?channels:[channels,];
    const keys = {};

    for(let i = 0;i < _channels.length; i++){
      const q = {
        selector: {
          '_id': {
            '$gte': printChannelId(_channels[i],null, null, false), // 'channel'+DIV+_channels[i]+DIV,
            '$lte': printChannelId(_channels[i], null, null, true), //'channel'+DIV+_channels[i]+DIV+'z', //TODO: find the last char code should be more encopasing
            },
          },
         'limit': Number(opts.limit||1000)
      };

      const res = await db.find(q);

      res.docs.forEach(doc=>{
        //remove duplicate docs with different revs
        keys[doc._id.split('||')[2]] = null;
      });
    }
    return keys;
    
  }
  catch(err){
    console.log(err);
    return false;
  }
}



// simulate a changes feed, segmented by user,
// given a 'since' and a 'user' and a 'limit'
const changes = async (opts) => {
  try {
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
    // TODO:: currently we are nonly loading changes for
    // user owned docs, but not looking at the channels
    // the user belongs to
    // imp: need to make multiple requests for user and
    // each channel user belongs to
    //const res = await loadChangesFromCouch(opts);
    const res = await loadChangesFromCouch(opts.user, opts.since, opts.limit);
    //if(res.length > 0)
    //  console.log(res[0].seq)
    const seq = (res.length > 0)? res[res.length-1].seq : 0;
    //we also need to shift first element, since it will be duplicate
    //TODO: tests show that we still need to use this?? not sure why
    if(opts.since != 0)
      res.shift();
    //if(opts.since != 0)
    //  res.shift(); //if its not init, then the first record will be dublicate

    //need to format the data
    res.forEach(r => {
      //delete r._id;
      delete r._rev
    });

    const changeResults = {
      results: res,
      last_seq: seq,
      pending: 0 //TODO: test with over 100 docs, can record tell us how many pending
    }
    return changeResults;
  }
  catch(err){
    console.log(err);
  }
    

}


// get the latest change from the changes feed database
const getSyncUserKey =  async (key) => {
  try{
    const row = await db.get(key);
    return result(true, row)
  }
  catch(err){
    // console.log(err);
    return result(false,null,err);
  }
}

const saveSyncUserKey = async (key, doc) => {
  try{
    const old = await getSyncUserKey(key);
    let newdoc = {_id: key, doc: doc};
    let eee = null;
    if(old.ok){
      newdoc._rev = old.res._rev;
    }
    try{
      const rec = await db.insert(newdoc);
      return result(true,rec);
    }
    catch(ee){
      eee = ee;
    }

    return result(false,null,eee,null);
  }
  catch (err){
    console.log(err);
    return result(false,null,err,null);
  }
  
}

// get the latest change from the changes feed database
const getLatestGlobalChangeSeq =  async (opts) => {
  let since = 0;
  try{
    const row = await db.get(LAST_SEQ);
    since = row.seq;
  }
  catch(err){
    if(err.error === 'not_found') {
      
    }
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
    loadDocRevisions,
    getDocKeysByChannels,

    //settings
    getSyncUserKey,
    saveSyncUserKey,

    //process
    processBatch,

    //channels
    getAllUserChannels,
  };
}
