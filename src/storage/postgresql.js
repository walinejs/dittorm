const Model = require('think-model/lib/model');
const PostgreSQL = require('think-model-postgresql');
const MySQLModel = require('./mysql');

module.exports = class PostgreSQLModel extends MySQLModel {
  constructor(tableName, config) {
    super(tableName, config);
    config.handle = PostgreSQL;
    this.model = (tableName) => new Model(tableName.toLowerCase(), config);
  }

  async select(...args) {
    const data = await super.select(...args);
    return data.map(({ insertedat, createdat, updatedat, ...item }) => {
      const mapFields = {
        insertedAt: insertedat,
        createdAt: createdat,
        updatedAt: updatedat,
      };
      for (const field in mapFields) {
        if (!mapFields[field]) {
          continue;
        }
        item[field] = mapFields[field];
      }
      return item;
    });
  }

  async count(...args) {
    let result = await super.count(...args);
    try {
      result = parseInt(result);
    } catch (e) {
      console.log(e);
    }
    return result;
  }
};