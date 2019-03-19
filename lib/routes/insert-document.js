const express = require('express')
const router = express.Router()
const app = require('../../app')
const uuid = require('uuid')
const access = require('../access')
const utils = require('../utils')
const auth = require('../auth')
const changesdb = require('../changesdb.js')

// Insert (or update) a document

router.put('/' + app.dbName + '/:id', auth.isAuthenticated, async (req, res) => {
  try {
    // 1. Get the document from cache (prev rev)
    // 2. Validate that the user has access
    // 3. return the document with the auth information stripped out
    const id = req.params.id || req.body._id || uuid.v4();


    //if id is local doc, need to add username to id
    if(id.startsWith('_local/')){
      //this is system doc, so we need to use the same method of saving as
      //in local.js route PUT function
      const key = id.split('/')[1];
      const user = req.session.user.name;
      const rec = await changesdb.saveSyncUserKey('local|'+user+'|'+key, req.body);

      const couchres = await app.cloudant.request({
        db: app.dbName,
        path: '_local/' +req.session.user.name +"|"+ req.params.key, 
        method: 'PUT',
        body: req.body
      })
      const formated = Object.assign(couchres, {id: id});
      return res.send(formated)

    }


    //access.addAccessMeta(doc, req.session.user.name);
    const newdoc = Object.assign(req.body, {_id: id});
    await access.addAccessMeta(newdoc, req.session.user.name);
    const allow = await access.canWrite(newdoc, req.session.user);
    if(allow){
      const doc = await app.db.insert(newdoc);
      return res.send(access.strip(doc));
    }
    else{
      throw new Error({status:401, message:'Access Denied' ,reason: 'Insufficient permissions'});
    }
  }
  catch(err){
    return utils.sendError(err, res)
  }
})

module.exports = router
