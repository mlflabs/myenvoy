const express = require('express')
const router = express.Router()
const app = require('../../app')
const auth = require('../auth')
const access = require('../access')
const changesdb = require('../changesdb.js')
const utils = require('../utils')

// _changes
router.get('/' + app.dbName + '/_changes', auth.isAuthenticated, async (req, res) => {
  try {
    const query = req.query || {}
    if (query.filter) {
      return auth.unauthorized(res); //TODO: no filter function implemented, YET :)
    }
    
    const data = await changesdb.changes({ 
      user:req.session.user, 
      since: query.since, 
      limit: query.limit,
      style: query.style || false 
    });
    
    data.spoolChangesProgress = app.spoolChangesProgress
    return res.send(data)
  }
  catch(err){
    console.log(err);
    return utils.sendError(err, res)
  }
})

module.exports = router
