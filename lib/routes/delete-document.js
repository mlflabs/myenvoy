const express = require('express')
const router = express.Router()
const app = require('../../app')
const access = require('../access')
const utils = require('../utils')
const auth = require('../auth')

// Delete a document
router.delete('/' + app.dbName + '/:id', auth.isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    if(!id){
      throw new Error({status:404, message:'Not Found' ,reason: 'Id not specified'});
    }
  
    const allow = await access.canDeleteById(id, req.session.user);
    if(allow){
      const data = await app.db.destroy(id, req.query.rev);
      res.send(access.strip(data))
    }
    else{
      return res.status(404).send({error: 'not_found', reason: 'missing'});
    }
  }
  catch(err){
    return utils.sendError(err, res)
  }
})

module.exports = router
