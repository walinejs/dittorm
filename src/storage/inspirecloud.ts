import { Inspirecloud } from '@byteinspire/api';
import helper from 'think-helper';
import { SelectOptions } from '../types/selectOption';
import { Where } from '../types/where';
import Base, { DittormConfigBase } from './base';

interface InspirecloudConfig {
  serviceId: string;
  serviceSecret: string;
  endpoint?: string;
}

export type InspireModelConfig = InspirecloudConfig & DittormConfigBase;

export default class InspireModel<T> extends Base<T> {
  db: any;

  static connect(config: InspireModelConfig) {
    if(!config.endpoint) {
      config.endpoint = process.env.INSPIRECLOUD_API_ENDPOINT || 'https://larkcloud-api.bytedance.com';
    }
    //@ts-ignore
    const inspirecloud = new Inspirecloud(config);
    return inspirecloud.db;
  }

  constructor(tableName: string, config: InspireModelConfig) {
    super(tableName, config);
    this.db = InspireModel.connect(config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return '_id';
  }

  parseWhere(where: Where<T>) {
    const _where = {};
    if (helper.isEmpty(where)) {
      return _where;
    }

    const parseKey = (k: string) => (k === this.pk ? this._pk : k);
    for (const k in where) {
      if (k === '_complex') {
        continue;
      }

      //@ts-ignore
      if (helper.isString(where[k]) || helper.isNumber(where[k]) || helper.isBoolean(where[k])) {
        //@ts-ignore
        _where[parseKey(k)] =
          //@ts-ignore
          k === this.pk ? this.db.ObjectId(where[k]) : where[k];
        continue;
      }
      //@ts-ignore
      if (where[k] === undefined) {
        //@ts-ignore
        _where[parseKey(k)] = undefined;
      }
      //@ts-ignore
      if (Array.isArray(where[k])) {
        //@ts-ignore
        if (where[k][0]) {
          //@ts-ignore
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              //@ts-ignore
              _where[parseKey(k)] = {
                $in:
                  k === this.pk
                    //@ts-ignore
                    ? where[k][1].map(this.db.ObjectId)
                    //@ts-ignore
                    : where[k][1],
              };
              break;
            case 'NOT IN':
              //@ts-ignore
              _where[parseKey(k)] = {
                $nin:
                  k === this.pk
                    //@ts-ignore
                    ? where[k][1].map(this.db.ObjectId)
                    //@ts-ignore
                    : where[k][1],
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
              //@ts-ignore
              _where[parseKey(k)] = { $regex: reg };
              break;
            }
            case '!=':
              //@ts-ignore
              _where[parseKey(k)] = { $ne: where[k] };
              break;
            case '>':
              //@ts-ignore
              _where[parseKey(k)] = { $gt: where[k] };
              break;
          }
        }
      }
    }

    return _where;
  }

  //@ts-ignore
  where(where) {
    const filter = this.parseWhere(where);
    if (!where._complex) {
      return filter;
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

    return { [`$${where._complex._logic}`]: filters };
  }

  //@ts-ignore
  async _select(where: Where<T>, { desc, limit, offset, field }: SelectOptions = {}) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));

    if (desc) {
      query.sort({ [desc]: -1 });
    }
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.skip(offset);
    }
    if (field) {
      const _field = {};
      //@ts-ignore
      field.forEach((f) => {
        //@ts-ignore
        _field[f] = 1;
      });
      query.projection(_field);
    }

    const data = await query.find();
    data.forEach((item: T) => {
      //@ts-ignore
      item[this.pk] = item[this._pk].toString();
      //@ts-ignore
      delete item[this._pk];
    });
    return data;
  }

  async select(where: Where<T>, options: SelectOptions = {}) {
    let data: T[] = [];
    let ret = [];
    let offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 1000);

    return data;
  }

  async count(where = {}) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));

    return query.count();
  }

  async add(data: Partial<T>) {
    const instance = this.db.table(this.tableName);
    const tableData = instance.create(data);
    await instance.save(tableData);

    tableData[this.pk] = tableData[this._pk].toString();
    delete tableData[this._pk];
    return tableData;
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));
    const items = await query.find();

    return Promise.all(
      items.map(async (item: T) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        for (const k in updateData) {
          //@ts-ignore
          item[k] = updateData[k];
        }
        await instance.save(item);
        return item;
      })
    );
  }

  async delete(where: Where<T>) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));
    return query.delete();
  }
};