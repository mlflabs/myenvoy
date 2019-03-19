/* eslint-env mocha */
'use strict'

const access = require('../lib/access.js')
const assert = require('assert')
const data = require('./_test_data');


describe('misc utils tests', function () {

  it('access canRead check read permissions valid doc', (done)=>{
    // access by username
    let res = access.canRead(data.doc1, data.mike);
    assert.strictEqual(res, true);

    res = access.canRead(data.doc2, data.mike);
    assert.equal(res, true);

    res = access.canRead(data.doc3, data.test1);
    assert.equal(res, false);
    
    // access by channel
    res = access.canRead(data.doc1, data.test1);
    assert.equal(res, true);
    res = access.canRead(data.doc2, data.test1);
    assert.equal(res, true);
    res = access.canRead(data.doc3, data.test1);
    assert.equal(res, false);

    res = access.canRead(data.doc1, data.test2);
    assert.equal(res, true);
    res = access.canRead(data.doc2, data.test2);
    assert.equal(res, true);
    res = access.canRead(data.doc3, data.test2);
    assert.equal(res, false);

    res = access.canRead(data.doc1, data.test3);
    assert.equal(res, false);
    res = access.canRead(data.doc2, data.test3);
    assert.equal(res, false);
    res = access.canRead(data.doc3, data.test3);
    assert.equal(res, false);

    res = access.canRead(data.doc1, data.test4);
    assert.equal(res, false);
    res = access.canRead(data.doc2, data.test4);
    assert.equal(res, false);

    done();
  });



})
