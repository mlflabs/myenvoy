const stream = require('stream'),
  app = require('../../../app'),
  isEqual = require('lodash.isequal');

/*
  Testing, schema proposal
// now we only use this for users
  "meta_access": {
    channels: {
      test1: 123,
      test2: 111,
    }
  }

  Rights, each digit represents different right
  1.  0 - Not admin 1- Admin, can change everything
  2.  (Project item) 0 - can't see, 1 - can see, 2 - can edit
  3.  (Project children) 0 - can't see, 1 - can see own, 2 - can see all items
  4.  (Project children edit) 0 -can't edit, 1 can edit/make own, 2 can edit all 



// only have channels, if channel name is username, then full access
  "meta_access": []

*/

const canReadById = async (id, user) =>{
  try {
    const prev = await app.changesdb.loadDocRevisions({_id: id, limit:1});

    if(prev.ok){
      const prevdoc = prev.res[0]
      //if its null, this means this is a new doc,
      //new docs, then we just pass it through
      if(!prevdoc){
        return true;
      }
      if(readAccess(prevdoc, user)){
        return true;
      }
    }
    return false;
  }
  catch(err){
    console.log(err);
    return false;
  }
}

const canRead = (doc, user) =>{
  return readAccess(doc, user);
}

const canWriteById = async (id, user) =>{
  const res = await canWrite({_id: id}, user);
  return res;
}

//p|5e6c519a77e3|......
const extractProjectId = (id) => {
  // first determine if in project
  if(id.startsWith(app.opts.projectKey+'|')){
    const pos1 = id.indexOf('|');
    const pos2 = id.indexOf('|', pos1+1);
    return id.slice(0, pos2+1)+app.opts.projectKey;
  }
  else {
    return null;
  }
  
}

const isProject = (id) => {
  return (id.startsWith(app.opts.projectKey + '|' + app.opts.projectServiceKey + '|'));
}

const newProjectHasValidAccess = (doc, user) => {
  const channels = extractChannels(doc);
  
  if(channels.length > 1) 
    return false; //new projects should only have one, user
  
  if(channels[0] === 'u|'+user.id)
    return true;
   
  if(channels[0].startsWith('u|'+user.id + '|'))
    return true;

  return writeAccess(doc, user, true);
}


const isProjectChild = (id) => {
  //first make sure its not a project
  if(isProject(id)) return false;

  return(id.startsWith(app.opts.projectKey+'|'));
}

const hasParentProjectAccess = async (doc, user) => {
  try{

    const uuid = extractProjectIdFromChild(doc._id)
    if(uuid){
      // only one channel allowed with username and uuid together
      const channels = extractChannels(doc);
      if(channels.length === 1)
        if(channels[0].startsWith('u|' + user.id + '|')) 
          return true;
    }

    const projres = await app.changesdb.loadDocRevisions(
      {_id: extractProjectId(doc._id), limit:1});
    console.log(projres);
    if(projres.ok && projres.res.length > 0){
      const proj = projres.res[0];
      console.log('app.opts.projectKey', proj);
      if(isEqual(proj[app.opts.projectKey], doc[app.opts.projectKey])){
        return writeAccess(doc, user, false); //now make sure access to project
      }
    }
    return false;
  }
  catch(e){
    console.log('HasParentProjectAccess Error: ');
    console.log(e);
    return false;
  }
}

const addParentProjectAccessRights = async (doc) =>{
  try {
    //its a child object, so just give same rights as project
    const projres = await app.changesdb.loadDocRevisions(
      {_id: extractProjectId(doc._id), limit:1});
    if(prev.ok){
      const proj = projres.res[0];
      doc[app.opts.accessMetaKey] = proj[app.opts.accessMetaKey];
      return doc;
    }
    return doc;
  }
  catch(e) { 
    console.log('addParentProjectAccessRights:: ');
    console.log(e);
    return doc;
  }
}

const extractProjectIdFromChild = (id) => {
  const res = id.split('|')[2]
  if(res.length > 0)
    return res;
  return null;
}

const addAccessMeta = async (doc, username) => {
  if(doc[app.opts.accessMetaKey]) 
    return doc;

  if(isProject(doc._id)){
    //its a project, so just add user to channels
    doc[app.opts.accessMetaKey] = ['u|'+username];
  }
  else if(isProjectChild(doc._id)){
    doc = await addParentProjectAccessRights(doc);
  }
  else {
    doc[app.opts.accessMetaKey] = ['u|'+username];
  }
  return doc;
}



const canWrite = async (doc, user) => {
  try{
    //load prev rev doc
    const prev = await app.changesdb.loadDocRevisions({_id: doc._id, limit:1});
    //see if user can write
    if(prev.ok){
      const prevdoc = prev.res[0]
      if(!prevdoc){
        //has meta key, by default need to have
        if(doc[app.opts.accessMetaKey]){
          //if its a projects, then it should by default only have one user
          /* Project */
          if(isProject(doc._id)){
            return newProjectHasValidAccess(doc, user);
          }
          /* Project Child */
          else if(isProjectChild(doc._id)){
            //its project child, so see if it has same access as parent
            return await hasParentProjectAccess(doc, user);
          }
          /* Independent */
          else {
            // basically same test as for project, only allowed to
            // have itself as channel
            return newProjectHasValidAccess(doc, user);
          }
        }
      }
      else {
        //make sure its same as prev object, and user has access
        if(isEqual(prevdoc[app.opts.accessMetaKey], doc[app.opts.accessMetaKey])){
          return writeAccess(doc, user);
        }
      }
    }
    return false;
  }
  catch(err){
    console.log('CanWrite ERROR: ', err);
    return false;
  }
}


// TODO here we just assume, user has channel, just can read and write
// we need to fix this us.
/*
  Rights, each digit represents different right
  0.  0 - Not admin 1- Admin, can change everything
  1.  (Project item) 0 - can't see, 1 - can see, 2 - can edit
  2.  (Project children) 0 - can't see, 1 - can see own, 2 - can see all items
  3.  (Project children edit) 0 -can't edit, 1 can edit/make own, 2 can edit all 
*/
const readAccess = (doc, user, isParent = null) => {

  if(isParent == null)
  isParent = isProject(doc._id);

  //no user access, check channel access
  const docChannels = extractChannels(doc);
  const userChannels = extractUserChannels(user);
  
  for (let i = 0; i < docChannels.length;i ++) {
    for(let x =0; x < userChannels.length; x++){
      // check if its this users channel
      if(docChannels[i].startsWith('u|'+user.id))
          return true;

      // check if this user has this channel
      if(docChannels[i] === userChannels[x]){
          const rights = user[app.opts.userChannelKey][userChannels[x]]
          if(isParent){
            if(rights.substring(0,1) === '1') 
              return true;
            if(rights.substring(1,1) === '1' || rights.substring(1,1) === '2') 
              return true;
          }
          else {
            //(0.1, 3.2) (if creator 3.1)
            if(rights.substring(0,1) === '1') 
              return true;
            if(rights.substring(2,1) === '2') 
              return true;
            if(rights.substring(2,1) === '1' && doc.creator && doc.creator === user.id) 
              return true;
          }
      }
    }
  }
  return false;
}

const canDeleteById = async (id, user) => {
  try {
    const res = await app.changesdb.loadDocRevisions({_id: id, limit:1});
    const doc = res.res[0];

    return writeAccess(doc, user);
  }
  catch(e){
    console.log('CanDeleteById');
    console.log(e);
    return false;
  }
}

/*
  Rights, each digit represents different right
  0.  0 - Not admin 1- Admin, can change everything
  1.  (Project item) 0 - can't see, 1 - can see, 2 - can edit
  2.  (Project children) 0 - can't see, 1 - can see own, 2 - can see all items
  3.  (Project children edit) 0 -can't edit, 1 can edit/make own, 2 can edit all 
*/
const writeAccess = (doc, user, isParent = null) => {
  //if parent is null, first check if its parent or child
  if(isParent == null)
  isParent = isProject(doc._id);


  //no user access, check channel access
  const docChannels = extractChannels(doc);
  const userChannels = extractUserChannels(user);

  for (let i = 0; i < docChannels.length;i ++) {
    for(let x =0; x < userChannels.length; x++){
      // check if its this users channel
      if(docChannels[i].startsWith('u|'+user.id))
          return true;

      // check if this user has this channel
      if(docChannels[i] === userChannels[x]){
        //admin(0.1), (1.2) needs these rights (#.# first digit represents position, second value)
        const rights = user[app.opts.userChannelKey][userChannels[x]]
        if(isParent){
          if(rights.substring(0,1) === '1') 
            return true;
          if(rights.substring(1,1) === '2') 
            return true;
        }
        else {
          //(0.1, 3.2) (if creator 3.1)
          if(rights.substring(0,1) === '1') 
            return true;
          if(rights.substring(3,1) === '2') 
            return true;
          if(rights.substring(3,1) === '1' && doc.creator && doc.creator === user.id) 
            return true;
        }
      }
    }
  }
  return false;
}
//change||u|mike|6673114efbc9||20

const extractChannels = (doc) => {
  if(!doc[app.opts.accessMetaKey]) 
    return [];
  return doc[app.opts.accessMetaKey];
}

const extractUserChannels = (user) => {
  if(!user[app.opts.userChannelKey]) 
    return ['u|'+ user.id + '|',];

  let keys =  Object.keys(user[app.opts.userChannelKey]);
  keys.push('u|'+ user.id + '|');

  return keys;
}





// stream transformer that removes auth details from documents
const authCheckStream = function(user, removeDoc) {
  let firstRecord = true;
  
  let addComma = false;
  const stripAuth =  (obj, user, removeDoc) => {
    
    let chunk = obj;

    // If the line ends with a comma, 
    // this would break JSON parsing.
    if (obj.endsWith(',')) {
      chunk = obj.slice(0, -1);
      addComma = true;
    }
    else {
      addComma = false;
    }

    let row;
    try { 
      row = JSON.parse(chunk); 
    } catch (e) {
      return obj+'\n'; // An incomplete fragment: pass along as is.
    }

    

    // Successfully parsed a doc line. Remove auth field.
    if (row.doc) {      
      if(canRead(row.doc, user)){
        strip(row.doc);
      }
      else {
        return '';
      }
    } 
  
    // if we need to remove the doc object
    if (removeDoc) {
      delete row.doc;
    }
  
    // cloudant query doesn't return a .doc
    delete row[app.opts.accessMetaKey];

    // Repack, and add the trailling comma if required
    var retval = JSON.stringify(row);
    let ending = (addComma)?',':'';
    if (firstRecord) {
      firstRecord = false;
      return retval+ending;
    } else {
      return '\n'+retval+ending;
    }
  };
  
  var tr = new stream.Transform({objectMode: true});
  tr._transform = function (obj, encoding, done) {
    var data = stripAuth(obj, user, removeDoc);
    if (data) {
      this.push(data);
    }
    done();
  };
  return tr;
};

const extractUsernameFromChannel = (value) => {
  if(value.startsWith('u|')){
    return value.split('|')[1];
  }
  return null;
}


// strips a document of its ownership information

var strip = (doc) => {
  //console.log('Strip: ', doc);
  //delete doc[app.opts.accessMetaKey];
  return doc;
};


module.exports = function() {
  return {
    //new
    canWrite,
    canWriteById,
    canRead,
    canReadById,
    canDeleteById,
    authCheckStream,
    extractChannels,
    extractUserChannels,
    extractUsernameFromChannel,
    addAccessMeta,
    strip,
  };
};
