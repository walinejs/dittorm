const Model = require('think-model/lib/model');
const SQLite = require('think-model-sqlite');
const MySQLModel = require('./mysql');

module.exports = class SQLiteModel extends MySQLModel {
  constructor(tableName, config) {
    super(tableName, config);
    config.handle = SQLite;
    this.model = (tableName) => new Model(tableName, config);
  }
}