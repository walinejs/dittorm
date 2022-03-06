import AV from 'leancloud-storage';
import helper from 'think-helper';
import { SelectOptions } from '../types/selectOption';
import { Where } from '../types/where';
import Base, { DittormConfigBase } from './base';


type LeanCloudInitOptions = Parameters<typeof AV.init>[0];
interface LeanCloudConfig {
  masterKey: string;
}
export type LeanCloudModelConfig = LeanCloudInitOptions & LeanCloudConfig & DittormConfigBase;

export default class LeanCloudModel<T> extends Base<T> {
  static connect(config: LeanCloudModelConfig) {
    //@ts-ignore
    AV.Cloud.useMasterKey(config.masterKey);
    AV.init(config);
  }

  constructor(tableName: string, config: LeanCloudModelConfig) {
    super(tableName, config);
    LeanCloudModel.connect(config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return 'objectId';
  }

  parseWhere(className:string, where:Where<T>) {
    const instance = new AV.Query(className);
    if (helper.isEmpty(where)) {
      return instance;
    }

    if(where.hasOwnProperty(this.pk)) {
      //@ts-ignore
      where[this._pk] = where[this.pk];
    }
    for (const k in where) {
      if (k === '_complex' || k === this.pk) {
        continue;
      }

      //@ts-ignore
      if (helper.isString(where[k]) || helper.isNumber(where[k]) || helper.isBoolean(where[k])) {
        //@ts-ignore
        instance.equalTo(k, where[k]);
        continue;
      }

      //@ts-ignore
      if (where[k] === undefined) {
        instance.doesNotExist(k);
        continue;
      }

      //@ts-ignore
      if (!Array.isArray(where[k]) || !where[k][0]) {
        continue;
      }

      //@ts-ignore
      const handler = where[k][0].toUpperCase();
      switch (handler) {
        case 'IN':
          //@ts-ignore
          instance.containedIn(k, where[k][1]);
          break;
        case 'NOT IN':
          //@ts-ignore
          instance.notContainedIn(k, where[k][1]);
          break;
        case 'LIKE': {
          //@ts-ignore
          const first = where[k][1][0];
          //@ts-ignore
          const last = where[k][1].slice(-1);
          if (first === '%' && last === '%') {
            //@ts-ignore
            instance.contains(k, where[k][1].slice(1, -1));
          } else if (first === '%') {
            //@ts-ignore
            instance.endsWith(k, where[k][1].slice(1));
          } else if (last === '%') {
            //@ts-ignore
            instance.startsWith(k, where[k][1].slice(0, -1));
          }
          break;
        }
        case '!=':
          //@ts-ignore
          instance.notEqualTo(k, where[k][1]);
          break;
        case '>':
          //@ts-ignore
          instance.greaterThan(k, where[k][1]);
          break;
      }
    }
    return instance;
  }

  where(className: string, where: Where<T>) {
    if (helper.isEmpty(where) || !where._complex) {
      return this.parseWhere(className, where);
    }

    const filters = [];
    for (const k in where._complex) {
      if (k === '_logic') {
        continue;
      }

      const filter = this.parseWhere(className, {
        ...where,
        //@ts-ignore
        [k]: where._complex[k],
      });
      filters.push(filter);
    }

    return AV.Query[where._complex._logic](...filters);
  }

  async _select(where: Where<T>, { desc, limit, offset, field }: SelectOptions = {}) {
    const instance = this.where(this.tableName, where);
    if (desc) {
      instance.descending(desc);
    }
    if (limit) {
      instance.limit(limit);
    }
    if (offset) {
      instance.skip(offset);
    }
    if (field) {
      instance.select(field);
    }

    const data = await instance.find().catch((e) => {
      if (e.code === 101) {
        return [];
      }
      throw e;
    });
    return data.map((item) => item.toJSON());
  }

  async select(where: Where<T>, options: SelectOptions = {}) {
    let data: T[] = [];
    let ret = [];
    let offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 100);

    return data.map(item => {
      //@ts-ignore
      item[this.pk] = item[this._pk].toString();
      //@ts-ignore
      delete item[this._pk];
      return item;
    });;
  }

  async count(where = {}, options = {}) {
    const instance = this.where(this.tableName, where);
    return instance.count(options).catch((e) => {
      if (e.code === 101) {
        return 0;
      }
      throw e;
    });
  }

  async add(
    data: Partial<T>,
    { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    const Table = AV.Object.extend(this.tableName);
    const instance = new Table();
    instance.set(data);

    const acl = new AV.ACL();
    acl.setPublicReadAccess(read);
    acl.setPublicWriteAccess(write);
    instance.setACL(acl);

    const resp = (await instance.save()).toJSON();
    resp[this.pk] = resp[this._pk];
    delete resp[this._pk];
    return resp;
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>) {
    const instance = this.where(this.tableName, where);
    const ret = await instance.find();

    return Promise.all(
      ret.map(async (item) => {
        if (helper.isFunction(data)) {
          //@ts-ignore
          item.set(data(item.toJSON()));
        } else {
          item.set(data);
        }

        const resp = await item.save();
        return resp.toJSON();
      })
    );
  }

  async delete(where: Where<T>) {
    const instance = this.where(this.tableName, where);
    const data = await instance.find();

    AV.Object.destroyAll(data as unknown as any);
  }
};