const express = require('express')
const path = require('path')
const app = require('../app')
const router = express.Router()
const plugin = process.env.ENVOY_ACCESS || app.options.accessPlugin || 'default'
const internalPlugins = {
  default: path.join(__dirname, 'plugins', 'access', 'default.js'),
  id: path.join(__dirname, 'plugins', 'access', 'id.js'),
  meta: path.join(__dirname, 'plugins', 'access', 'meta.js')
}
const isCustom = !internalPlugins[plugin]
const pluginPath = isCustom ? plugin : internalPlugins[plugin]
console.log('[OK]  Using the ' + (isCustom ? pluginPath : plugin) + ' access control plugin')
module.exports = require(path.resolve(pluginPath))(app, router)
