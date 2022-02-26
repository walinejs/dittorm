const { Inspirecloud } = require('@byteinspire/api');
const helper = require('think-helper');
const Base = require('./base');
module.exports = class InspireModel extends Base {
  static connect(config = {}) {
    if(!config.endpoint) {
      config.endpoint = process.env.INSPIRECLOUD_API_ENDPOINT || 'https://larkcloud-api.bytedance.com';
    }
    const inspirecloud = new Inspirecloud(config);
    return inspirecloud.db;
  }

  constructor(tableName, config) {
    super(tableName, config);
    this.db = InspireModel.connect(config);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return '_id';
  }

  parseWhere(where) {
    const _where = {};
    if (helper.isEmpty(where)) {
      return _where;
    }

    const parseKey = (k) => (k === this.pk ? this._pk : k);
    for (const k in where) {
      if (k === '_complex') {
        continue;
      }

      if (helper.isString(where[k])) {
        _where[parseKey(k)] =
          k === this.pk ? this.db.ObjectId(where[k]) : where[k];
        continue;
      }
      if (where[k] === undefined) {
        _where[parseKey(k)] = undefined;
      }
      if (Array.isArray(where[k])) {
        if (where[k][0]) {
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              _where[parseKey(k)] = {
                $in:
                  k === this.pk
                    ? where[k][1].map(this.db.ObjectId)
                    : where[k][1],
              };
              break;
            case 'NOT IN':
              _where[parseKey(k)] = {
                $nin:
                  k === this.pk
                    ? where[k][1].map(this.db.ObjectId)
                    : where[k][1],
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
              _where[parseKey(k)] = { $regex: reg };
              break;
            }
            case '!=':
              _where[parseKey(k)] = { $ne: where[k] };
              break;
            case '>':
              _where[parseKey(k)] = { $gt: where[k] };
              break;
          }
        }
      }
    }

    return _where;
  }

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
        ...this.parseWhere({ [k]: where._complex[k] }),
        ...filter,
      });
    }

    return { [`$${where._complex._logic}`]: filters };
  }

  async _select(where, { desc, limit, offset, field } = {}) {
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
      field.forEach((f) => {
        _field[f] = 1;
      });
      query.projection(_field);
    }

    const data = await query.find();
    data.forEach((item) => {
      item[this.pk] = item[this._pk].toString();
      delete item[this._pk];
    });
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
    } while (ret.length === 1000);

    return data;
  }

  async count(where = {}) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));

    return query.count();
  }

  async add(data) {
    const instance = this.db.table(this.tableName);
    const tableData = instance.create(data);
    await instance.save(tableData);

    tableData[this.pk] = tableData[this._pk].toString();
    delete tableData[this._pk];
    return tableData;
  }

  async update(data, where) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));
    const items = await query.find();

    return Promise.all(
      items.map(async (item) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        for (const k in updateData) {
          item[k] = updateData[k];
        }
        await instance.save(item);
        return item;
      })
    );
  }

  async delete(where) {
    const instance = this.db.table(this.tableName);
    const query = instance.where(this.where(where));
    return query.delete();
  }
};