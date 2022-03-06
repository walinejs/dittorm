//@ts-ignore
import Model from 'think-model/lib/model';
import PostgreSQL from 'think-model-postgresql';
import MySQLModel from './mysql';
import type { ClientConfig } from 'pg';
import { DittormConfigBase } from './base';
 
interface HandleConfig {
  handle: PostgreSQL;
}
export type PostgreSQLModelConfig = ClientConfig & HandleConfig & DittormConfigBase;

export default class PostgreSQLModel<T> extends MySQLModel<T> {
  constructor(tableName: string, config: PostgreSQLModelConfig) {
    super(tableName, config as unknown as any);
    config.handle = PostgreSQL;
    this.model = (tableName) => new Model(tableName.toLowerCase(), config);
  }

  //@ts-ignore
  async select(...args) {
    //@ts-ignore
    const data = await super.select(...args);
    //@ts-ignore
    return data.map(({ insertedat, createdat, updatedat, ...item }) => {
      const mapFields = {
        insertedAt: insertedat,
        createdAt: createdat,
        updatedAt: updatedat,
      };
      for (const field in mapFields) {
        //@ts-ignore
        if (!mapFields[field]) {
          continue;
        }
        //@ts-ignore
        item[field] = mapFields[field];
      }
      return item;
    });
  }

  //@ts-ignore
  async count(...args) {
    let result = await super.count(...args);
    try {
      //@ts-ignore
      result = parseInt(result);
    } catch (e) {
      console.log(e);
    }
    return result;
  }
};