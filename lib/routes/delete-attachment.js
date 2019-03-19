const express = require('express')
const router = express.Router()
const app = require('../../app')
const access = require('../access')
const auth = require('../auth')
const utils = require('../utils')

router.delete('/' + app.dbName + '/:id/*', auth.isAuthenticated, async (req, res) => {
  try {
    // 1. Get the document from cache (prev rev)
    // 2. Validate that the user has access
    // 3. return the document with the auth information stripped out
    const id = req.params.id;
    if(!id){
      throw new Error({status:404, message:'Not Found' ,reason: 'Id not specified'});
    }
    const allow = access.canWriteById(id, req.session.user);
    if(allow){
      const doc = await app.db.attachment.destroy(id, req.params['0'], req.query)
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
