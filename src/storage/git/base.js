const path = require('path');
const helper = require('think-helper');
const { parseString, writeToString } = require('fast-csv');
const Base = require('../base');

module.exports = class extends Base {
  constructor(tableName, config) {
    super(tableName, config);
    this.tableName = tableName;
  }

  async collection(tableName) {
    const filename = path.join(this.basePath, tableName + '.csv');
    const file = await this.git.get(filename).catch((e) => {
      if (e.statusCode === 404) {
        return '';
      }
      throw e;
    });

    return new Promise((resolve, reject) => {
      const data = [];
      data.sha = file.sha;
      return parseString(file.data, {
        headers: true,
      })
        .on('error', reject)
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data));
    });
  }

  async save(tableName, data, sha) {
    const filename = path.join(this.basePath, tableName + '.csv');
    const csv = await writeToString(data, {
      headers: true,
      writeHeaders: true,
    });
    return this.git.set(filename, csv, { sha });
  }

  parseWhere(where) {
    const _where = [];
    if (helper.isEmpty(where)) {
      return _where;
    }

    const filters = [];
    for (let k in where) {
      if (k === '_complex') {
        continue;
      }

      if (helper.isNumber(where[k]) || helper.isString(where[k])) {
        filters.push((item) => item[k] === where[k]);
        continue;
      }
      if (where[k] === undefined) {
        filters.push((item) => item[k] === null || item[k] === undefined);
      }
      if (!Array.isArray(where[k]) || !where[k][0]) {
        continue;
      }

      const handler = where[k][0].toUpperCase();
      switch (handler) {
        case 'IN':
          filters.push((item) => where[k][1].includes(item[k]));
          break;
        case 'NOT IN':
          filters.push((item) => !where[k][1].includes(item[k]));
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
          filters.push((item) => reg.test(item[k]));
          break;
        }
        case '!=':
          filters.push((item) => item[k] !== where[k][1]);
          break;
        case '>':
          filters.push((item) => item[k] >= where[k][1]);
          break;
      }
    }

    return filters;
  }

  where(data, where) {
    const filter = this.parseWhere(where);

    if (!where._complex) {
      return data.filter((item) => filter.every((fn) => fn(item)));
    }

    const logicMap = {
      and: Array.prototype.every,
      or: Array.prototype.some,
    };
    const filters = [];
    for (const k in where._complex) {
      if (k === '_logic') {
        continue;
      }

      filters.push([...filter, ...this.parseWhere({ [k]: where._complex[k] })]);
    }

    const logicFn = logicMap[where._complex._logic];
    return data.filter((item) =>
      logicFn.call(filters, (filter) => filter.every((fn) => fn(item)))
    );
  }

  async select(where, { desc, limit, offset, field } = {}) {
    const instance = await this.collection(this.tableName);
    let data = this.where(instance, where);
    if (desc) {
      data.sort((a, b) => {
        if (['insertedAt', 'createdAt', 'updatedAt'].includes(desc)) {
          const aTime = new Date(a[desc]).getTime();
          const bTime = new Date(b[desc]).getTime();
          return bTime - aTime;
        }
        return a[desc] - b[desc];
      });
    }

    data = data.slice(limit || 0, offset || data.length);
    if (field) {
      field.push('id');
      const fieldObj = {};
      field.forEach((f) => (fieldObj[f] = true));
      data = data.map((item) => {
        const ret = {};
        for (const k in item) {
          if (fieldObj[k]) {
            ret[k] = item[k];
          }
        }
        return ret;
      });
    }

    return data;
  }

  // eslint-disable-next-line no-unused-vars
  async count(where = {}, options = {}) {
    const instance = await this.collection(this.tableName);
    const data = this.where(instance, where);
    return data.length;
  }

  async add(
    data,
    // eslint-disable-next-line no-unused-vars
    { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    const instance = await this.collection(this.tableName);
    const id = Math.random().toString(36).slice(2, 15);

    instance.push({ ...data, id });
    await this.save(this.tableName, instance, instance.sha);
    return id;
  }

  async update(data, where) {
    const instance = await this.collection(this.tableName);
    const list = this.where(instance, where);

    list.forEach((item) => {
      if (typeof data === 'function') {
        data(item);
      } else {
        for (const k in data) {
          item[k] = data[k];
        }
      }
    });
    await this.save(this.tableName, instance, instance.sha);
    return list;
  }

  async delete(where) {
    const instance = await this.collection(this.tableName);
    const deleteData = this.where(instance, where);
    const deleteId = deleteData.map(({ id }) => id);
    const data = instance.filter((data) => !deleteId.includes(data.id));
    await this.save(this.tableName, data, instance.sha);
  }
};