const cloudbase = require('@cloudbase/node-sdk');
const helper = require('think-helper');
const Base = require('./base');


const collections = {};

module.exports = class CloudBase extends Base {
  static connect(config) {
    const app = cloudbase.init(config);
    const db = app.database();
    return db;
  }

  constructor(tableName, config) {
    super(tableName, config);
    this.db = CloudBase.connect(config);
  }

  get _pk() {
    return '_id';
  }

  async collection(tableName) {
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
      if (e.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        await db.createCollection(tableName);
        collections[tableName] = true;
        return db.collection(tableName);
      }
      throw e;
    }
  }

  parseWhere(where) {
    if (helper.isEmpty(where)) {
      return {};
    }

    const _ = this.db.command;
    const filter = {};
    const parseKey = (k) => k;
    for (let k in where) {
      if (k === '_complex') {
        continue;
      }
      if (helper.isString(where[k])) {
        filter[parseKey(k)] = _.eq(where[k]);
        continue;
      }
      if (where[k] === undefined) {
        filter[parseKey(k)] = _.eq(null);
      }
      if (Array.isArray(where[k])) {
        if (where[k][0]) {
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              filter[parseKey(k)] = _.in(where[k][1]);
              break;
            case 'NOT IN':
              filter[parseKey(k)] = _.nin(where[k][1]);
              break;
            case 'LIKE': {
              const first = where[k][1][0];
              const last = where[k][1].slice(-1);
              let reg;
              if (first === '%' && last === '%') {
                reg = new RegExp(where[k][1].slice(1, -1));
              } else if (first === '%') {
                reg = new RegExp(where[k][1].slice(1) + '$');
              } else if (last === '%') {
                reg = new RegExp('^' + where[k][1].slice(0, -1));
              }
              filter[parseKey(k)] = reg;
              break;
            }
            case '!=': {
              filter[parseKey(k)] = _.neq(where[k][1]);
              break;
            }
            case '>': {
              filter[parseKey(k)] = _.gt(where[k][1]);
              break;
            }
          }
        }
      }
    }
    return filter;
  }

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
        ...this.parseWhere({ [k]: where._complex[k] }),
        ...filter,
      });
    }
    return instance.where(_[where._complex._logic](...filters));
  }

  async _select(where, { desc, limit, offset, field } = {}) {
    let instance = await this.collection(this.tableName);
    instance = this.where(instance, where);
    if (desc) {
      instance = instance.orderBy(desc, 'desc');
    }
    if (limit) {
      instance = instance.limit(limit);
    }
    if (offset) {
      instance = instance.skip(offset);
    }
    if (field) {
      const filedObj = {};
      field.forEach((f) => (filedObj[f] = true));
      instance = instance.field(filedObj);
    }

    const { data } = await instance.get();
    return data;
  }

  async select(where, options = {}) {
    let data = [];
    let ret = [];
    let offset = options.offset || 0;
    do {
      options.offset = offset + data.length;
      ret = await this._select(where, options);
      data = data.concat(ret);
    } while (ret.length === 100);

    return data;
  }

  async count(where = {}) {
    const instance = await this.collection(this.tableName);
    const { total } = await this.where(instance, where).count();
    return total;
  }

  async add(data) {
    const instance = await this.collection(this.tableName);
    const { id } = await instance.add(data);
    return id;
  }

  async update(data, where) {
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

  async delete(where) {
    const instance = await this.collection(this.tableName);
    return this.where(instance, where).remove();
  }
};