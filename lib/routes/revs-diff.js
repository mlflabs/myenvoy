const express = require('express')
const router = express.Router()
const app = require('../../app')
const access = require('../access')
const utils = require('../utils')
const auth = require('../auth')

// Authenticated request to _revs_diff.
//
// Possible states per {docid, revid} tuple:
//
// 1. New document id that server has never seen:
//
//  Return {docid:{missing: [revid]}}
//
// 2. Existing docid where user has access to current leaf:
//
//  Return either {docid:{missing: [revid]}} or nothing depending on
//  whether it's present
//
// 3. Existing docid where user does not have access to current leaf:
//
//  Return {docid:{missing: [revid]}} (even though it is actuall NOT missing)
//
// The last state whilst not representing a leak at this point will
// result in a 401 for a subsequent POST, but this is true for a POST
// anyway (a.k.a 'winning the lottery').
//
// The Cloudant/Nano library does not support the revsDiff API end point
// directly, so we use the cloudant.request() call to roll our own.

/*
//from client new item
{"todotasks|0c64ec95-3ff0-4dac-8060-3075e5e5846d":
  {"missing":["1-9c0bfc9e6790b9c86753364bc022662d"]}}



  
*/
router.post('/' + app.dbName + '/_revs_diff', auth.isAuthenticated, async (req, res) => {
  try {
    //if no body provided, just send an ok, let replicator know we exist
    if(!req.body){
      return res.send({ok: true});
    }

    //console.log(req.body);
    const filtered = {};
    //make sure all ids have proper read permissions
    // TODO::: here we can load from cache
    // TODO: still need to figure out how to better prevent
    // users from even seeing that we are missing or not missing
    // documents that they have no rights seeing

    // const keys = Object.keys(req.body);
    // for(let i =0;i<keys.length;i++){
    //  const allow = await access.canReadById(keys[i], req.session.user);
    //  if(allow){
    //    filtered[keys[i]]= req.body[keys[i]];
    //  }
    //}
 
    const revs = await  app.cloudant.request({
        db: app.dbName,
        path: '_revs_diff',
        method: 'POST',
        body: req.body
    });
    //console.log('_revs_diff', revs);
    res.send(revs)
  
  }
  catch(err){
    return utils.sendError(err, res)
  }
});

module.exports = router
