const express = require('express')
const app = require('../../app.js')
const router = express.Router()

const auth = require('../auth')
if (auth.routes) {
  router.use(auth.routes)
}

const access = require('../access')
if (access.routes) {
  router.use(access.routes)
}

if (app.opts.production === false) {
  router.use(require('./post-adduser'))
}

router.use(require('./all-docs'))
router.use(require('./bulk-get'))
router.use(require('./local'))
router.use(require('./get-root'))
router.use(require('./get-database'))
router.use(require('./revs-diff'))
router.use(require('./bulk-docs'))
router.use(require('./changes'))
router.use(require('./delete-document'))
router.use(require('./put-attachment'))
router.use(require('./delete-attachment'))
router.use(require('./get-attachment'))
router.use(require('./get-document'))
router.use(require('./insert-document'))
router.use(require('./update-document'))

module.exports = router
