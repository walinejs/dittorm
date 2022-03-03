const { Deta } = require('deta');
const helper = require('think-helper');
const { performance } = require('perf_hooks');
const Base = require('./base');

module.exports = class DetaModel extends Base {
  static connect(config) {
    return Deta(config.token);
  }

  constructor(tableName, config) {
    super(tableName, config);
    const deta = DetaModel.connect(config);
    this.instance = deta.Base(tableName);
    this.pk = config.primaryKey;
  }

  get _pk() {
    return 'key';
  }

  complex(obj, keys) {
    const result = new Array(keys.reduce((a, b) => a * obj[b].length, 1));
    for (let i = 0; i < result.length; i++) {
      result[i] = { ...obj };
      for (let n = 0; n < keys.length; n++) {
        const divisor = keys
          .slice(n + 1)
          .reduce((a, b) => a * obj[b].length, 1);
        const idx = Math.floor(i / divisor) % obj[keys[n]].length;
        result[i][keys[n]] = obj[keys[n]][idx];
      }
    }

    return result;
  }

  /**
   * deta base doesn't support order data by field
   * it will order by key default
   * so we need create a lower key than before to keep latest data in front
   * @returns string
   */
  async uuid() {
    const items = await this.select({}, { limit: 1 });
    let lastKey;
    if (items.length && !isNaN(parseInt(items[0][this.pk]))) {
      lastKey = parseInt(items[0][this.pk]);
    } else {
      lastKey = Number.MAX_SAFE_INTEGER - performance.now();
    }
    return (lastKey - Math.round(Math.random() * 100)).toString();
  }

  where(where) {
    if (helper.isEmpty(where)) {
      return;
    }

    const parseKey = k => (k === this.pk ? this._pk : k);
    const conditions = {};
    const _isArrayKeys = [];
    for (let k in where) {
      if (helper.isString(where[k]) || helper.isNumber(where[k]) || helper.isBoolean(where[k])) {
        conditions[parseKey(k)] = where[k];
        continue;
      }
      if (where[k] === undefined) {
        conditions[parseKey(k)] = null;
      }

      if (!helper.isArray(where[k]) || !where[k][0]) {
        continue;
      }
      const handler = where[k][0].toUpperCase();
      switch (handler) {
        case 'IN':
          conditions[parseKey(k)] = where[k][1];
          if (helper.isArray(where[k][1])) {
            _isArrayKeys.push(parseKey(k));
          }
          break;
        
        case 'NOT IN':
          console.warn(`deta base doesn't support not equal with multiple value query`);
          break;

        case 'LIKE': {
          const first = where[k][1][0];
          const last = where[k][1].slice(-1);
          if (first === '%' && last === '%') {
            conditions[parseKey(k) + '?contains'] = where[k][1].slice(1, -1);
          } else if (first === '%') {
            conditions[parseKey(k) + '?contains'] = where[k][1].slice(1);
          } else if (last === '%') {
            conditions[parseKey(k) + '?pfx'] = where[k][1].slice(0, -1);
          }
          break;
        }
        case '!=':
          conditions[parseKey(k) + '?ne'] = where[k][1];
          break;
        case '>':
          conditions[parseKey(k) + '?gt'] = where[k][1];
          break;
      }
    }

    if (_isArrayKeys.length === 0) {
      return conditions;
    }

    return this.complex(conditions, _isArrayKeys);
  }

  async select(where, { limit, offset, field } = {}) {
    const conditions = this.where(where);
    if (helper.isArray(conditions)) {
      return Promise.all(
        conditions.map((condition) =>
          this.select(condition, { limit, offset, field })
        )
      ).then((data) => data.flat());
    }

    let data = [];
    if (
      helper.isObject(conditions) &&
      helper.isString(conditions.key) &&
      conditions.key
    ) {
      /**
       * deta base doesn't support fetch with key field query
       * if you want query by key field
       * you need use `get()` rather than `fetch()` method.
       */
      const item = await this.instance.get(conditions.key);
      item && data.push(item);
    } else if (offset) {
      /**
       * deta base need last data key when pagination
       * so we need fetch data list again and again
       * because only that we can get last data key
       */
      while (data.length < limit + offset) {
        const lastData = data[data.length - 1];
        const last = lastData ? lastData.key : undefined;
        const { items } = await this.instance.fetch(conditions, {
          limit,
          last,
        });
        data = data.concat(items);

        if (items.length < limit) {
          break;
        }
      }

      data = data.slice(offset, offset + limit);
    } else {
      const { items } = await this.instance.fetch(conditions, {
        limit: limit,
      });
      data = items || [];
    }

    data = data.map(item => {
      item[this.pk] = item[this._pk];
      delete item[this._pk];
      return item;
    });

    if (Array.isArray(field)) {
      const fieldMap = new Set(field);
      fieldMap.add(this.pk);
      data.forEach((item) => {
        for (const k in item) {
          if (!fieldMap.has(k)) {
            delete item[k];
          }
        }
      });
    }

    return data;
  }

  async count(where = {}) {
    const conditions = this.where(where);
    if (helper.isArray(conditions)) {
      return Promise.all(
        conditions.map((condition) => this.count(condition))
      ).then((counts) => counts.reduce((a, b) => a + b, 0));
    }

    const { count } = await this.instance.fetch(conditions);
    return count;
  }

  async add(data) {
    const uuid = await this.uuid();
    const resp = await this.instance.put(data, uuid);
    resp[this.pk] = resp[this._pk];
    delete resp[this._pk];
    return resp;
  }

  async update(data, where) {
    const items = await this.select(where);
    return Promise.all(
      items.map(async (item) => {
        const updateData = typeof data === 'function' ? data(item) : data;
        const nextData = { ...item, ...updateData };
        await this.instance.put(nextData, item[this.pk]);
        return nextData;
      })
    );
  }

  async delete(where) {
    const items = await this.select(where);
    return Promise.all(
      items.map((item) => this.instance.delete(item[this.pk]))
    );
  }
};