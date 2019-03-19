const stream = require('stream'),
  app = require('../../../app'),
  isEqual = require('lodash.isequal');

/*
  Testing, schema proposal
// now we only use this for users
  "meta_access": {
    users: { //users not needed for user object
      "mike": {
        "r": true,
        "w": true
      }
    },
    channels: {
      test1: {
        "r": true,
        "w": true
      },
      test2: {
        "r": true,
        "w": true
      }
    }
  }

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
  return (id.endsWith('|'+app.opts.projectKey))
}

const newProjectHasValidAccess = (doc, user) => {
  const channels = extractChannels(doc);
  
  if(channels.length > 1) 
    return false; //new projects should only have one, user
  
  if(channels[0] === 'u|'+user.name)
    return true;

  if(channels[0].startsWith('u|'+user.name))
    return true;

  return false;
}


const isProjectChild = (id) => {
  //first make sure its not a project
  if(isProject) return false;

  return(id.startsWith(app.opts.projectKey+'|'));
}

const hasParentProjectAccess = async (doc, user) => {
  try{

    const uuid = extractProjectIdFromChild(doc._id)
    if(uuid){
      // only one channel allowed with username and uuid together
      const channels = extractChannels(doc);
      if(channels[0] === 'u|' + user.name+'|'+uuid) 
        return true;
    }

    const projres = await app.changesdb.loadDocRevisions(
      {_id: extractProjectId(doc._id), limit:1});
  
    if(prev.ok){
      const proj = projres.res[0];
      if(isEqual(proj[app.opts.projectKey], doc[app.opts.projectKey])){
        return writeAccess(doc, user); //now make sure access to project
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
  if(res.length > 10)
    return res;
  return null;
}

const extractUUID = (id) =>{
  if(isProject(id)){
    const res = id.split('|');
    return res[res.length-2];
  }
  else if(isProjectChild(id)){
    const res = id.split('|');
    return res[res.length-1];
  }
  else{
    const res = id.split('|');
    return res[res.length-1];
  }
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

const readAccess = (doc, user) => {
  //no user access, check channel access
  const docChannels = extractChannels(doc);
  const userChannels = extractUserChannels(user);
  
  for (let i = 0; i < docChannels.length;i ++) {
    for(let x =0; x < userChannels.length; x++){
      if(docChannels[i] === userChannels[x]){
        if(docChannels[i].startsWith('u|'+user.name))
          return true;

        if(user[app.opts.accessMetaKey][userChannels[x]]['r']){
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

const writeAccess = (doc, user) => {
  //no user access, check channel access
  const docChannels = extractChannels(doc);
  const userChannels = extractUserChannels(user);

  for (let i = 0; i < docChannels.length;i ++) {
    for(let x =0; x < userChannels.length; x++){
      if(docChannels[i] === userChannels[x]){
        //is it userchannel
        if(docChannels[i].startsWith('u|'+user.name))
          return true;

        if(user[app.opts.accessMetaKey][userChannels[x]]['w']){
          return true;
        }
      }
    }
  }
  return false;
}

const extractChannels = (doc) => {
  if(!doc[app.opts.accessMetaKey]) 
    return [];
  return doc[app.opts.accessMetaKey];
}

const extractUserChannels = (user) => {
  if(!user[app.opts.accessMetaKey]) 
  return ['u|'+ user.name,];

  let keys =  Object.keys(user[app.opts.accessMetaKey]);
  keys.push('u|'+ user.name);
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
