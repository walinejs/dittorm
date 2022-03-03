const Model = require('think-mongo/lib/model');
const { ObjectId } = require('mongodb');
const helper = require('think-helper');
const Base = require('./base');

module.exports = class extends Base {
  constructor(tableName, config) {
    super(tableName, config);
    this.mongo = name => new Model(name, config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return '_id';
  }
  
  parseWhere(where) {
    if (helper.isEmpty(where)) {
      return {};
    }

    const filter = {};
    const parseKey = (k) => (k === this.pk ? this._pk : k);
    for (let k in where) {
      if (k === '_complex') {
        continue;
      }
      if (helper.isString(where[k])) {
        filter[parseKey(k)] = {
          $eq: k === this.pk ? ObjectId(where[k]) : where[k],
        };
        continue;
      }
      if (where[k] === undefined) {
        filter[parseKey(k)] = { $eq: null };
      }
      if (Array.isArray(where[k])) {
        if (where[k][0]) {
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              if (k === this.pk) {
                filter[parseKey(k)] = { $in: where[k][1].map(ObjectId) };
              } else {
                filter[parseKey(k)] = {
                  $regex: new RegExp(`^(${where[k][1].join('|')})$`),
                };
              }
              break;
            case 'NOT IN':
              filter[parseKey(k)] = {
                $nin:
                  k === this.pk ? where[k][1].map(ObjectId) : where[k][1],
              };
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

              if (reg) {
                filter[parseKey(k)] = { $regex: reg };
              }
              break;
            }
            case '!=':
              filter[parseKey(k)] = { $ne: where[k][1] };
              break;
            case '>':
              filter[parseKey(k)] = { $gt: where[k][1] };
              break;
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

    return instance.where({
      // $or, $and, $not, $nor
      [`$${where._complex._logic.toLowerCase()}`]: filters,
    });
  }

  async select(where, { desc, limit, offset, field } = {}) {
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
    return data.map(item => {
      item[this.pk] = item[this._pk].toString();
      delete item[this._pk];
      return item;
    });
  }

  async count(where = {}) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    return instance.count();
  }

  async add(data) {
    const instance = this.mongo(this.tableName);
    const id = await instance.add(data);
    return { ...data, [this.pk]: id.toString() };
  }

  async update(data, where) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    const list = await instance.select();

    return Promise.all(
      list.map(async (item) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        const instance = this.mongo(this.tableName);
        this.where(instance, where);
        await instance.update(updateData);
        return { ...item, ...updateData };
      })
    );
  }

  async delete(where) {
    const instance = this.mongo(this.tableName);
    this.where(instance, where);
    return instance.delete();
  }
};