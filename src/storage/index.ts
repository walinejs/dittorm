import cloudbase from './cloudbase';
import deta from './deta';
import inspirecloud from './inspirecloud';
import leancloud from './leancloud';
import mongodb from './mongodb';
import mysql from './mysql';
import postgresql from './postgresql';
import github from './git/github';

let sqlite;
try {
  require('think-model-sqlite');
  sqlite = require('./sqlite');
} catch(e) {
  // ignore error
}

const baseStorages = {
  cloudbase,
  deta,
  github,
  inspirecloud,
  leancloud,
  mongodb,
  mysql,
  postgresql,
  sqlite: undefined,
};
if(sqlite) {
  baseStorages.sqlite = sqlite;
}

export default baseStorages;