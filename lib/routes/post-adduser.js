const express = require('express')
const router = express.Router()
const auth = require('../auth')

// warning message;
const warning = '[WARNING] POST /_adduser is enabled. This is recommended for testing only. It can be disabled by setting env variable PRODUCTION=true'

// warning
console.log(warning)

// Beginners API call to allow users to be created
router.post('/_adduser', (req, res) => {
  // warning message
  console.error(warning)

  // missing parameters
  if (!req.body.username || !req.body.password) {
    return res.status(400).send({ ok: false, error: 'username and password are mandatory' })
  }

  // Authenticate the documents requested
  auth.newUser(req.body.username, req.body.password, {}).then((data) => {
    data.warning = warning
    res.send(data)
  }).catch((err) => {
    res.status(403).send(err)
  })
})

module.exports = router
