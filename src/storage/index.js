const cloudbase = require('./cloudbase');
const deta = require('./deta');
const inspirecloud = require('./inspirecloud');
const leancloud = require('./leancloud');
const mongodb = require('./mongodb');
const mysql = require('./mysql');
const postgresql = require('./postgresql');
const github = require('./git/github');
let sqlite;
try {
  require('think-model-sqlite');
  sqlite = require('./sqlite');
} catch(e) {
  // ignore error
}

const storages = {
  cloudbase,
  deta,
  github,
  inspirecloud,
  leancloud,
  mongodb,
  mysql,
  postgresql
};
if(sqlite) {
  storages.sqlite = sqlite;
}

module.exports = storages;