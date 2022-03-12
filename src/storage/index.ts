import cloudbase, { CloudBaseModelClass } from './cloudbase';
import deta, { DetaModelClass } from './deta';
import inspirecloud, { InspireModelClass } from './inspirecloud';
import leancloud, { LeanCloudModelClass } from './leancloud';
import mongodb, { MongoDBModelClass } from './mongodb';
import mysql, { MySQLModelClass } from './mysql';
import postgresql, { PostgreSQLModelClass } from './postgresql';
import github, { GitHubModelClass } from './git/github';
import type { SQLiteModelClass } from './sqlite';

let sqlite;
try {
  require('think-model-sqlite');
  sqlite = require('./sqlite');
} catch(e) {
  // ignore error
}

export interface IStorages {
  cloudbase: CloudBaseModelClass,
  deta: DetaModelClass,
  github: GitHubModelClass,
  inspirecloud: InspireModelClass,
  leancloud: LeanCloudModelClass,
  mongodb: MongoDBModelClass,
  mysql: MySQLModelClass,
  postgresql: PostgreSQLModelClass,
  sqlite: SQLiteModelClass
};

const baseStorages:IStorages = {
  cloudbase,
  deta,
  github,
  inspirecloud,
  leancloud,
  mongodb,
  mysql,
  postgresql,
  sqlite,
};

export default baseStorages;