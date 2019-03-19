const express = require('express')
const path = require('path')
const app = require('../app')
const router = express.Router()
const plugin =  app.opts.authPlugin || 'default'
const internalPlugins = {
  couchdb_user: path.join(__dirname, 'plugins', 'auth', 'couchdb_user.js'),
  jwt: path.join(__dirname, 'plugins', 'auth', 'jwt.js'),
  default: path.join(__dirname, 'plugins', 'auth', 'default.js')
}
const isCustom = !internalPlugins[plugin]
const pluginPath = isCustom ? plugin : internalPlugins[plugin]
console.log('[OK]  Using the ' + (isCustom ? pluginPath : plugin) + ' auth plugin')
module.exports = require(path.resolve(pluginPath))(app, router)
