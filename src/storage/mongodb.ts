//@ts-ignore
import Model from 'think-mongo/lib/model';
//@ts-ignore
import { ObjectId } from 'mongodb';
import helper from 'think-helper';
import Base, { DittormConfigBase } from './base';
import { Where } from '../types/where';
import { SelectOptions } from '../types/selectOption';

interface MongoDBConfig {
  host: string;
  post: string;
  user: string;
  password: string;
  database: string;
  options: string;
}

export type MongoDBModelConfig = MongoDBConfig & DittormConfigBase;

export default class MongoDBModel<T> extends Base<T> {
  mongo: (name: string) => typeof Model;
  constructor(tableName: string, config: MongoDBModelConfig) {
    super(tableName, config);
    this.mongo = name => new Model(name, config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return '_id';
  }
  
  parseWhere(where: Where<T>) {
    if (helper.isEmpty(where)) {
      return {};
    }

    const filter = {};
    const parseKey = (k: string) => (k === this.pk ? this._pk : k);
    for (let k in where) {
      if (k === '_complex') {
        continue;
      }
      //@ts-ignore
      if (helper.isString(where[k]) || helper.isNumber(where[k]) || helper.isBoolean(where[k])) {
        //@ts-ignore
        filter[parseKey(k)] = {
          //@ts-ignore
          $eq: k === this.pk ? ObjectId(where[k]) : where[k],
        };
        continue;
      }
      //@ts-ignore
      if (where[k] === undefined) {
        //@ts-ignore
        filter[parseKey(k)] = { $eq: null };
      }
      //@ts-ignore
      if (Array.isArray(where[k])) {
        //@ts-ignore
        if (where[k][0]) {
          //@ts-ignore
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              if (k === this.pk) {
                //@ts-ignore
                filter[parseKey(k)] = { $in: where[k][1].map(ObjectId) };
              } else {
                //@ts-ignore
                filter[parseKey(k)] = {
                  //@ts-ignore
                  $regex: new RegExp(`^(${where[k][1].join('|')})$`),
                };
              }
              break;
            case 'NOT IN':
              //@ts-ignore
              filter[parseKey(k)] = {
                $nin:
                //@ts-ignore
                  k === this.pk ? where[k][1].map(ObjectId) : where[k][1],
              };
              break;
            case 'LIKE': {
              //@ts-ignore
              const first = where[k][1][0];
              //@ts-ignore
              const last = where[k][1].slice(-1);
              let reg;
              if (first === '%' && last === '%') {
                //@ts-ignore
                reg = new RegExp(where[k][1].slice(1, -1));
              } else if (first === '%') {
                //@ts-ignore
                reg = new RegExp(where[k][1].slice(1) + '$');
              } else if (last === '%') {
                //@ts-ignore
                reg = new RegExp('^' + where[k][1].slice(0, -1));
              }

              if (reg) {
                //@ts-ignore
                filter[parseKey(k)] = { $regex: reg };
              }
              break;
            }
            case '!=':
              //@ts-ignore
              filter[parseKey(k)] = { $ne: where[k][1] };
              break;
            case '>':
              //@ts-ignore
              filter[parseKey(k)] = { $gt: where[k][1] };
              break;
          }
        }
      }
    }
    return filter;
  }

  //@ts-ignore
  where(instance, where) {
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

    return instance.where({
      // $or, $and, $not, $nor
      [`$${where._complex._logic.toLowerCase()}`]: filters,
    });
  }

  async select(where:Where<T>, { desc, limit, offset, field }: SelectOptions = {}) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    if (desc) {
      instance.order(`${desc} DESC`);
    }
    if (limit || offset) {
      instance.limit(offset || 0, limit);
    }
    if (field) {
      instance.field(field);
    }

    const data = await instance.select();
    return data.map((item: T) => {
      //@ts-ignore
      item[this.pk] = item[this._pk].toString();
      //@ts-ignore
      delete item[this._pk];
      return item;
    }) as T[];
  }

  async count(where: Where<T> = {}) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    return instance.count() as number;
  }

  async add(data: Partial<T>) {
    const instance = this.mongo(this.tableName);
    const id = await instance.add(data);
    return { ...data, [this.pk]: id.toString() };
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    const list = await instance.select();

    return Promise.all(
      list.map(async (item: T) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        await instance.update(updateData);
        return { ...item, ...updateData };
      })
    );
  }

  async delete(where: Where<T>) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    return instance.delete();
  }
};