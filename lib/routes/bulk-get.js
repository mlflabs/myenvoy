// NOTE: The _bulk_get end point does not return its results line-by-line
// as e.g. _changes.
//
// NOTE: The response format is convoluted, and seemingly undocumented.
//
//  "results": [
// {
//   "id": "1c43dd76fee5036c0cb360648301a710",
//   "docs": [
//     {
//       "ok": { ..doc body here...
//
//         }
//       }
//     }
//   ]
// },
//
// Not sure if the "docs" array can ever contain multiple items.

const express = require('express')
const router = express.Router()
const app = require('../../app')
const auth = require('../auth')
const access = require('../access')
const utils = require('../utils')

// Pouch does this to check it exists
router.get('/' + app.dbName + '/_bulk_get', auth.isAuthenticated, (req, res) => {
  res.status(405).send({ error: 'method_not_allowed', reason: 'Only POST allowed' })
})

router.post('/' + app.dbName + '/_bulk_get', auth.isAuthenticated, async (req, res) => {
  try {
    if(!req.body || !req.body.docs){
      return res.status(400).send('Invalid request');
    }
    const error_docs = [];
    const filtered = [];
    //check if user has the right permissions to get these
    //const keys = Object.keys(req.body);
    for(let i =0;i<req.body.docs.length;i++){
      const allow = await access.canReadById(req.body.docs[i].id, req.session.user);
      if(allow){
        filtered.push(req.body.docs[i]);
      }
      else{
        error_docs.push({
          error: 'forbidden',
          id: req.body.docs[i].id,
          reason: 'insufficient permissions'
        })
      }
    }

    const data = await app.cloudant.request({
      db: app.dbName,
      qs: req.query || {},
      path: '_bulk_get',
      method: 'POST',
      body: {docs: filtered}
    });

    const results = data.results.concat(error_docs);
    res.send({ results: results })

  }
  catch(err){
    console.log(err);
    return utils.sendError(err, res)
  }

});

module.exports = router
