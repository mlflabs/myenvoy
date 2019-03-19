'use strict'
var access = require('../lib/access');
var utils = require('../lib/utils');
var assert = require('assert');
var env = require('../lib/env.js');
var app = require('../app');

describe('last test - final cleanup', () => {
  it('should handle blank lines', async () => {
    assert(true);
  })

  after(async () => {
    try{
      var e = env.setup();
      let remote = require('nano')('http://mike:pass@localhost:5984');

      const dbs = await remote.db.list();
      const name = 'zenvoy';
      let counter = 0;
      console.log(dbs, dbs.length);
      for(let i=0; i<dbs.length; i++){
        if(dbs[i].startsWith(name)){
          counter++;
          console.log(dbs[i]);
          await remote.db.destroy(dbs[i])
        }
      }
    console.log('Finished deleteing temp databases: '+counter);
    }
    catch(e){
      console.log(e);
    }
    

  });
})
