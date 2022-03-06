//@ts-ignore
import Model from 'think-model/lib/model';
import MySQL from 'think-model-mysql';
import helper from 'think-helper';
import Base, { DittormConfigBase } from './base';
import { Where } from '../types/where';
import type { ConnectionConfig } from 'mysql';
import { SelectOptions } from '../types/selectOption';

interface ThinkModelHandle {
  handle: MySQL;
};
export type MySQLModelConfig = ConnectionConfig & DittormConfigBase & ThinkModelHandle;

export default class MySQLModel<T> extends Base<T> {
  model: (tableName: string) => typeof Model;

  constructor(tableName: string, config: MySQLModelConfig) {
    super(tableName, config);
    config.handle = MySQL;
    this.model = (tableName) => new Model(tableName, config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return 'id';
  }

  parseWhere(filter: Where<T>) {
    const where: Record<string, unknown> = {};
    if (helper.isEmpty(filter)) {
      return where;
    }

    for (const k in filter) {
      if (k === this.pk) {
        //@ts-ignore
        where[this._pk] = filter[k];
        continue;
      }

      //@ts-ignore
      if (filter[k] === undefined) {
        where[k] = null;
        continue;
      }

      //@ts-ignore
      if (Array.isArray(filter[k])) {
        //@ts-ignore
        if (filter[k][0] === 'IN' && !filter[k][1].length) {
          continue;
        }
        //@ts-ignore
        if (helper.isDate(filter[k][1])) {
          //@ts-ignore
          filter[k][1] = helper.datetime(filter[k][1]);
        }
      }

      //@ts-ignore
      where[k] = filter[k];
    }
    return where;
  }

  async select(where:Where<T>, { desc, limit, offset, field }: SelectOptions = {}) {
    const instance = this.model(this.tableName);
    instance.where(this.parseWhere(where));
    if (desc) {
      instance.order(`${desc} DESC`);
    }
    if (limit || offset) {
      instance.limit(offset || 0, limit);
    }
    if (field) {
      field.push('id');
      instance.field(field);
    }

    const data = await instance.select();
    return data.map((item: T) => {
      //@ts-ignore
      item[this.pk] = item[this._pk];
      //@ts-ignore
      delete item[this._pk];
      return item;
    }) as T[];
  }

  async count(where = {}) {
    const instance = this.model(this.tableName);
    instance.where(this.parseWhere(where));
    return instance.count() as number;
  }

  async add(data: Partial<T>) {
    const instance = this.model(this.tableName);
    const id = await instance.add(data);
    return { ...data, [this.pk]: id } as T;
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>) {
    const list = await this.model(this.tableName)
      .where(this.parseWhere(where))
      .select();
    return Promise.all(
      list.map(async (item: T) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        await this.model(this.tableName)
        //@ts-ignore
          .where({ [this.pk]: item[this.pk] })
          .update(updateData);
        return { ...item, ...updateData };
      })
    );
  }

  async delete(where:Where<T>) {
    const instance = this.model(this.tableName);
    return instance.where(this.parseWhere(where)).delete();
  }
};