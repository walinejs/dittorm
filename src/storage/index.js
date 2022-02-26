const cloudbase = require('./cloudbase');
const deta = require('./deta');
const inspirecloud = require('./inspirecloud');
const leancloud = require('./leancloud');
const mongodb = require('./mongodb');
const mysql = require('./mysql');
const sqlite = require('./sqlite');
const postgresql = require('./postgresql');
const github = require('./git/github');

module.exports = {
  cloudbase,
  deta,
  github,
  inspirecloud,
  leancloud,
  mongodb,
  mysql,
  sqlite,
  postgresql
};