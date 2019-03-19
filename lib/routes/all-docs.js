/*
  CouchDB 2 will support the filtering of _all_docs by id, but
  unfortunately at the time of writing this is not implemented
  correctly for dbnext, hence the heath-robinson solution below.
*/

const express = require('express')
const router = express.Router()
const app = require('../../app')
const access = require('../access')
const utils = require('../utils')
const auth = require('../auth')






router.get('/' + app.dbName + '/_all_docs', auth.isAuthenticated, async (req, res) => {
  try{
    let keys; 
    if (!req.query || !req.query.keys) {
      //load keys for user
      //const userkeys = await app.changesdb.getDocKeysByUsername(req.session.user.name);

      //load keys for user channels
      //const channels = access.extractUserChannels(req.session.user);
      const channels = await app.changesdb.getAllUserChannels(req.session.user);
      const channelkeys = await app.changesdb.getDocKeysByChannels(channels);

      keys = Object.keys(channelkeys);
      
    }


    //TODO: here using stream, total rows will still show total for all users
    // need to change total just for this user, maybe useauthCheck stream to look
    // for total
    req.query = Object.assign(req.query, {keys:keys||req.query.keys})
    app.db.listAsStream(req.query)
      .pipe(utils.liner())
      .pipe(access.authCheckStream(req.session.user))
      .pipe(res)


  }
  catch(err){
    return utils.sendError(err, res)
  }
})

router.post('/' + app.dbName + '/_all_docs', auth.isAuthenticated, async (req, res) => {
  try{
    let keys; 
    req.query['include_docs'] = true
    
    if (!req.body || !req.body.keys) {
      //load keys for user
      //const userkeys = await app.changesdb.getDocKeysByUsername(req.session.user.name);

      //load keys for user channels
      // const channels = access.extractUserChannels(req.session.user);
      const channels = await app.changesdb.getAllUserChannels(req.session.user);
      const channelkeys = await app.changesdb.getDocKeysByChannels(channels);
      keys = Object.keys(channelkeys);
    }
    

    app.cloudant.request({
      db: app.dbName,
      qs: req.query,
      path: '_all_docs',
      method: 'POST',
      body: {keys:keys||req.body.keys},
      stream: true
    }).pipe(utils.liner())
      .pipe(access.authCheckStream(req.session.user))
      .pipe(res)
  }
  catch(err){
    return utils.sendError(err, res)
  }
})

module.exports = router
