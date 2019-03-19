const express = require('express')
const path = require('path')
const app = require('../app')
const router = express.Router()
const plugin =  app.opts.changesDbPlugin || 'default'
const internalPlugins = {
  default: path.join(__dirname, 'plugins', 'changesdb', 'default.js'),
  leveldb: path.join(__dirname, 'plugins', 'changesdb', 'level.js')
}
const isCustom = !internalPlugins[plugin]
const pluginPath = isCustom ? plugin : internalPlugins[plugin]
console.log('[OK]  Using the ' + (isCustom ? pluginPath : plugin) + ' dao plugin')
module.exports = require(path.resolve(pluginPath))(app, router)
