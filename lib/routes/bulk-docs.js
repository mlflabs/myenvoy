const express = require('express')
const router = express.Router()
const app = require('../../app')
const access = require('../access')
const utils = require('../utils')
const uuid = require('uuid')
const auth = require('../auth')

const filterReply = (reply) => {
  for (let i in reply) {
    reply[i] = access.strip(reply[i])
  }
  return reply
}

// _bulk_docs
// TODO:: this is where all our users edits appear, need to have a better permissions system.
router.post('/' + app.dbName + '/_bulk_docs', auth.isAuthenticated, async (req, res) => {
  try {
    const newEdits = typeof req.body.new_edits === 'undefined' ? true : req.body.new_edits

    // Iterate through docs, adding uuids when missing and adding owner ids
    let doclist = [];
    let errors = [];
    if (req.body && req.body.docs && req.body.docs.length) {
      for(let i=0; i < req.body.docs.length; i++){
        const doc = req.body.docs[i];
        if (typeof doc === 'object') {
          if (!doc._id) {
            doc._id = uuid.v4();
          }
          await access.addAccessMeta(doc, req.session.user.name);
          const allow = await access.canWrite(doc, req.session.user);
          if(allow){
            doclist.push(doc);
          }
          else {
            errors.push({
              id: doc._id,
              error: 'forbidden',
              reason: 'Insufficient write permissions'
            });
          }
        }
        else{
          doclist.push(doc);
        }
      }
    }
    else {
      return res.status(400).send("Invalid request");
    }
    const data = await app.db.bulk({ docs: doclist, new_edits: newEdits });
    //add error docs
    const fullresults = data.concat(errors);
    return res.send(fullresults);

  }
  catch(err){
    console.log(err);
    return utils.sendError(err, res)
  }
})

module.exports = router
