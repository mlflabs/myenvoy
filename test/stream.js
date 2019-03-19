/* eslint-env mocha */
'use strict'

var access = require('../lib/access')

var utils = require('../lib/utils')

describe('stream processing', function () {
  it('should handle blank lines', function (done) {
    var fs = require('fs')
    var tmp = '/tmp/out.txt'
    var ws = fs.createWriteStream(tmp)
    fs.createReadStream('./test/simulatedchanges.txt', { encoding: 'utf8' })
      .pipe(utils.liner())
      .pipe(access.authCheckStream())
      .pipe(ws)
      .on('close', function () {
        var output = fs.readFileSync(tmp, 'utf8')
        // this should parse as JSON
        try{
          JSON.parse(output)
          done()
        }
        catch(err){
          console.log(err);
        }
        
        
      })
  })
})
