const express = require('express')
const router = express.Router()
const uuid = require('uuid')
const app = require('../../app')
const access = require('../access')
const utils = require('../utils')
const auth = require('../auth')

// Update a document
const handler = async (req, res) => {

  req.body = req.body || {}
  req.body._id = req.params.id || req.body._id || uuid.v4();
  const id = req.body._id;
  //if id is local doc, need to add username to id,
  //follow a different path than adding user specific docs
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

  //path for user specific docs
  await access.addAccessMeta(req.body, req.session.user.name);
  const allow = await access.canWrite(req.body, req.session.user);
  if(allow){
    const doc = await app.db.insert(req.body);
    return res.send(access.strip(doc));
  }
  else{
    throw new Error({status:401, message:'Access Denied' ,reason: 'Insufficient permissions'});
  }



  app.db.insert(req.body, (err, body) => {
    if (err) {
      return utils.sendError(err, res)
    }
    res.send(access.strip(body))
  })
}

router.post('/' + app.dbName + '/:id', auth.isAuthenticated, handler)
router.post('/' + app.dbName, auth.isAuthenticated, handler)

module.exports = router
