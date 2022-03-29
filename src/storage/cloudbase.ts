import CloudBase from '@cloudbase/node-sdk';
import helper from 'think-helper';
import { SelectOptions } from '../types/selectOption';
import { Where } from '../types/where';
import Base, { DittormConfigBase } from './base';

const collections: Record<string, boolean> = {};

interface CloudBaseError extends Error {
  code: string;
}

export type CloudBaseModelConfig = CloudBase.ICloudBaseConfig & DittormConfigBase;
export type CloudBaseModelClass = typeof CloudBaseModel;
export default class CloudBaseModel<T> extends Base<T> {
  db: CloudBase.Database.Db;
  pk: string;

  static connect(config: CloudBaseModelConfig) {
    const app = CloudBase.init(config);
    const db = app.database();
    return db;
  }

  constructor(tableName: string, config: CloudBaseModelConfig) {
    super(tableName, config);
    this.db = CloudBaseModel.connect(config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return '_id';
  }

  async collection(tableName: string) {
    const db = this.db;
    if (collections[tableName]) {
      return db.collection(tableName);
    }

    try {
      const instance = db.collection(tableName);
      await instance.count();
      collections[tableName] = true;
      return db.collection(tableName);
    } catch (e) {
      if ((e as CloudBaseError).code === 'DATABASE_COLLECTION_NOT_EXIST') {
        await db.createCollection(tableName);
        collections[tableName] = true;
        return db.collection(tableName);
      }
      throw e;
    }
  }

  parseWhere(where: Where<T>) {
    if (helper.isEmpty(where)) {
      return {};
    }

    const _ = this.db.command;
    const filter: Record<string, unknown> = {};
    const parseKey = (k: string) => (k === this.pk ? this._pk : k);
    for (let k in where) {
      if (k === '_complex' || k === '_logic') {
        continue;
      }
      if (helper.isString(where[k as keyof T]) || helper.isNumber(where[k as keyof T]) || helper.isBoolean(where[k as keyof T])) {
        filter[parseKey(k)] = _.eq(where[k as keyof T]);
        continue;
      }
      if (where[k as keyof T] === undefined) {
        filter[parseKey(k)] = _.eq(null);
      }
      const filterValue = where[k as keyof T];
      if (Array.isArray(filterValue)) {
        if (filterValue[0]) {
          const handler = filterValue[0].toUpperCase();
          switch (handler) {
            case 'IN':
              filter[parseKey(k)] = _.in(filterValue[1]);
              break;
            case 'NOT IN':
              filter[parseKey(k)] = _.nin(filterValue[1]);
              break;
            case 'LIKE': {
              const first = filterValue[0];
              const last = filterValue[1].slice(-1);
              let reg;
              if (first === '%' && last === '%') {
                reg = new RegExp(filterValue[1].slice(1, -1));
              } else if (first === '%') {
                reg = new RegExp(filterValue[1].slice(1) + '$');
              } else if (last === '%') {
                reg = new RegExp('^' + filterValue[1].slice(0, -1));
              }
              filter[parseKey(k)] = reg;
              break;
            }
            case '!=': {
              filter[parseKey(k)] = _.neq(filterValue[1]);
              break;
            }
            case '>': {
              filter[parseKey(k)] = _.gt(filterValue[1]);
              break;
            }
          }
        }
      }
    }
    return filter;
  }

  where(instance: CloudBase.Database.CollectionReference, where:Where<T>) {
    const _ = this.db.command;
    const filter = this.parseWhere(where);
    if (!where._complex) {
      return instance.where(filter);
    }

    const filters = [];
    for (const k in where._complex) {
      if (k === '_logic') {
        continue;
      }
      filters.push({
        //@ts-ignore
        ...this.parseWhere({ [k]: where._complex[k] }),
        ...filter,
      });
    }
    return instance.where(_[where._complex._logic](...filters));
  }

  async _select(where: Where<T>, { desc, limit, offset, field }: SelectOptions = {}) {
    const instance = await this.collection(this.tableName);
    let query = this.where(instance, where);
    if (desc) {
      query = query.orderBy(desc, 'desc');
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.skip(offset);
    }
    if (field) {
      const filedObj:Record<string, boolean> = {};
      field.forEach((f) => (filedObj[f] = true));
      query = query.field(filedObj);
    }

    const { data } = await query.get();
    return data.map(item => {
      const pk = item[this._pk].toString();
      delete item[this._pk];
      item[this.pk] = pk;
      return item;
    });
  }

  async select(where: Where<T>, options: SelectOptions = {}) {
    let data:T[] = [];
    let ret = [];
    let offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 100);

    return data;
  }

  async count(where:Where<T> = {}) {
    const instance = await this.collection(this.tableName);
    const { total } = await this.where(instance, where).count();
    return total || 0;
  }

  async add(data: Partial<T>) {
    const instance = await this.collection(this.tableName);
    const { id } = await instance.add(data);
    return { ...data, [this.pk]: id };
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>) {
    const instance = await this.collection(this.tableName);
    const { data: list } = await this.where(instance, where).get();

    return Promise.all(
      list.map(async (item) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        const instance = await this.collection(this.tableName);
        await instance.doc(item._id).update(updateData);
        return { ...item, ...updateData };
      })
    );
  }

  async delete(where: Where<T>) {
    const instance = await this.collection(this.tableName);
    this.where(instance, where).remove();
  }
};