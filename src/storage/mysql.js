const Model = require('think-model/lib/model');
const MySQL = require('think-model-mysql');
const helper = require('think-helper');
const Base = require('./base');

module.exports = class MySQLModel extends Base {
  constructor(tableName, config) {
    super(tableName, config);
    config.handle = MySQL;
    this.model = (tableName) => new Model(tableName, config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return 'id';
  }

  parseWhere(filter) {
    const where = {};
    if (helper.isEmpty(filter)) {
      return where;
    }

    for (const k in filter) {
      if (k === this.pk) {
        where[this._pk] = filter[k];
        continue;
      }

      if (filter[k] === undefined) {
        where[k] = null;
        continue;
      }

      if (Array.isArray(filter[k])) {
        if (filter[k][0] === 'IN' && !filter[k][1].length) {
          continue;
        }
        if (helper.isDate(filter[k][1])) {
          filter[k][1] = helper.datetime(filter[k][1]);
        }
      }

      where[k] = filter[k];
    }
    return where;
  }

  async select(where, { desc, limit, offset, field } = {}) {
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
    return data.map(item => {
      item[this.pk] = item[this._pk];
      delete item[this._pk];
      return item;
    });
  }

  async count(where = {}) {
    const instance = this.model(this.tableName);
    instance.where(this.parseWhere(where));
    return instance.count();
  }

  async add(data) {
    const instance = this.model(this.tableName);
    const id = await instance.add(data);
    return { ...data, [this.pk]: id };
  }

  async update(data, where) {
    const list = await this.model(this.tableName)
      .where(this.parseWhere(where))
      .select();
    return Promise.all(
      list.map(async (item) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        await this.model(this.tableName)
          .where({ id: item.id })
          .update(updateData);
        return { ...item, ...updateData };
      })
    );
  }

  async delete(where) {
    const instance = this.model(this.tableName);
    return instance.where(this.parseWhere(where)).delete();
  }
};