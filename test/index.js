require('dotenv').config();
const test = require('ava');
const config = require('./config');
const Ditto = require('../src');

for(const type in config) {
  test(`${type} select`, async t => {
    const dittoModel = new Ditto(type)('Comment', config[type]);
    const resp = await dittoModel.select({url: '/test'});
    t.deepEqual(resp, []);
  });
}