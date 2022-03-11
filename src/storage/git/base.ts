import path from 'path';
import helper from 'think-helper';
import { parseString, writeToString } from 'fast-csv';
import Base, { DittormConfigBase } from '../base';
import { Where } from '../../types/where';
import { SelectOptions } from '../../types/selectOption';

export interface GitInstance<T> {
  get: (filename: string) => Promise<any>;
  set: (filename: string, data: string, options: any) => void;
}

export default class GitBase<T> extends Base<T> {
  //@ts-ignore
  basePath: string;
  //@ts-ignore
  git: GitInstance<T>;

  constructor(tableName: string, config: DittormConfigBase) {
    super(tableName, config);
    this.tableName = tableName;
    this.pk = config.primaryKey;
  }

  get _pk() {
    return 'id';
  }

  async collection(tableName: string) {
    const filename = path.join(this.basePath, tableName + '.csv');
    const file = await this.git.get(filename).catch((e) => {
      if (e.statusCode === 404) {
        return '';
      }
      throw e;
    });

    return new Promise((resolve, reject) => {
      const data: T[] = [];
      //@ts-ignore
      data.sha = file.sha;
      //@ts-ignore
      return parseString(file.data, {
        headers: true,
      })
        .on('error', reject)
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data));
    });
  }

  async save(tableName: string, data: T[], sha: string) {
    const filename = path.join(this.basePath, tableName + '.csv');
    const csv = await writeToString(data, {
      headers: true,
      writeHeaders: true,
    });
    return this.git.set(filename, csv, { sha });
  }

  parseWhere(where:any) {
    const _where: ((item: T) => boolean)[] = [];
    if (helper.isEmpty(where)) {
      return _where;
    }

    const filters = [];
    for (let k in where) {
      if (k === '_complex') {
        continue;
      }

      if (helper.isNumber(where[k]) || helper.isString(where[k])) {
        //@ts-ignore
        filters.push((item: T) => item[k] === where[k]);
        continue;
      }
      if (where[k] === undefined) {
        //@ts-ignore
        filters.push((item) => item[k] === null || item[k] === undefined);
      }
      if (!Array.isArray(where[k]) || !where[k][0]) {
        continue;
      }

      const handler = where[k][0].toUpperCase();
      switch (handler) {
        case 'IN':
          //@ts-ignore
          filters.push((item) => where[k][1].includes(item[k]));
          break;
        case 'NOT IN':
          //@ts-ignore
          filters.push((item) => !where[k][1].includes(item[k]));
          break;
        case 'LIKE': {
          const first = where[k][1][0];
          const last = where[k][1].slice(-1);
          let reg: RegExp;
          if (first === '%' && last === '%') {
            reg = new RegExp(where[k][1].slice(1, -1));
          } else if (first === '%') {
            reg = new RegExp(where[k][1].slice(1) + '$');
          } else if (last === '%') {
            reg = new RegExp('^' + where[k][1].slice(0, -1));
          }
          //@ts-ignore
          filters.push((item) => reg.test(item[k]));
          break;
        }
        case '!=':
          //@ts-ignore
          filters.push((item) => item[k] !== where[k][1]);
          break;
        case '>':
          //@ts-ignore
          filters.push((item) => item[k] >= where[k][1]);
          break;
      }
    }

    return filters;
  }

  where(data: T[], where:Where<T>) {
    const filter = this.parseWhere(where);

    if (!where._complex) {
      return data.filter((item) => filter.every((fn) => fn(item)));
    }

    const logicMap = {
      and: Array.prototype.every,
      or: Array.prototype.some,
    };
    const filters: any[] = [];
    for (const k in where._complex) {
      if (k === '_logic') {
        continue;
      }

      //@ts-ignore
      filters.push([...filter, ...this.parseWhere({ [k]: where._complex[k] })]);
    }

    const logicFn = logicMap[where._complex._logic];
    return data.filter((item) =>
      logicFn.call(filters, (filter) => filter.every((fn:(item: T) => boolean) => fn(item)))
    );
  }

  async select(where:Where<T>, { desc, limit, offset, field }:SelectOptions = {}) {
    const instance = await this.collection(this.tableName);
    let data = this.where(instance as T[], where);
    if (desc) {
      data.sort((a, b) => {
        if (['insertedAt', 'createdAt', 'updatedAt'].includes(desc)) {
          //@ts-ignore
          const aTime = new Date(a[desc]).getTime();
          //@ts-ignore
          const bTime = new Date(b[desc]).getTime();
          return bTime - aTime;
        }
        //@ts-ignore
        return a[desc] - b[desc];
      });
    }

    data = data.slice(limit || 0, offset || data.length);
    if (field) {
      field.push('id');
      const fieldObj = {};
      //@ts-ignore
      field.forEach((f) => (fieldObj[f] = true));
      //@ts-ignore
      data = data.map((item) => {
        const ret = {};
        for (const k in item) {
          //@ts-ignore
          if (fieldObj[k]) {
            //@ts-ignore
            ret[k] = item[k];
          }
        }
        return ret;
      });
    }

    return data.map(item => {
      //@ts-ignore
      const pk = item[this._pk];
      //@ts-ignore
      delete item[this._pk];
      //@ts-ignore
      item[this.pk] = pk;
      return item;
    });
  }

  // eslint-disable-next-line no-unused-vars
  async count(where:Where<T> = {}, options = {}) {
    const instance = await this.collection(this.tableName);
    const data = this.where(instance as T[], where);
    return data.length;
  }

  async add(
    data: Partial<T>,
    // eslint-disable-next-line no-unused-vars
    { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    const instance = await this.collection(this.tableName);
    const id = Math.random().toString(36).slice(2, 15);

    //@ts-ignore
    instance.push({ ...data, [this.pk]: id });
    //@ts-ignore
    await this.save(this.tableName, instance, instance.sha);
    return { ...data, [this.pk]: id };
  }

  async update(data: Partial<T>|((item: T) => T), where: Where<T>) {
    //@ts-ignore
    delete data[this.pk];
    
    const instance = await this.collection(this.tableName);
    //@ts-ignore
    const list = this.where(instance, where);

    list.forEach((item) => {
      if (typeof data === 'function') {
        data(item);
      } else {
        for (const k in data) {
          //@ts-ignore
          item[k] = data[k];
        }
      }
    });
    //@ts-ignore
    await this.save(this.tableName, instance, instance.sha);
    return list;
  }

  async delete(where: Where<T>) {
    const instance = await this.collection(this.tableName);
    //@ts-ignore
    const deleteData = this.where(instance, where);
    //@ts-ignore
    const deleteId = deleteData.map(({ id }) => id);
    //@ts-ignore
    const data = instance.filter((data) => !deleteId.includes(data.id));
    //@ts-ignore
    await this.save(this.tableName, data, instance.sha);
  }
};