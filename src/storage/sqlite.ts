//@ts-ignore
import Model from 'think-model/lib/model';
import { DittormConfigBase } from './base';
import MySQLModel from './mysql';

let SQLite = function() {};
try {
  SQLite = require('think-model-sqlite');
} catch(e) {
  // ignore error
}

interface SQLiteConfig {
  path: string;
  handle: any;
}
export type SQLiteModelConfig = SQLiteConfig & DittormConfigBase;
export type SQLiteModelClass = typeof SQLiteModel;
export default class SQLiteModel<T> extends MySQLModel<T> {
  constructor(tableName: string, config: SQLiteModelConfig) {
    super(tableName, config);
    config.handle = SQLite;
    this.model = (tableName) => new Model(tableName, config);
  }
}