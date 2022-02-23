const AV = require('leancloud-storage');
const Base = require('./base');
module.exports = class LeanCloudModel extends Base {
  static connect(config) {
    AV.Cloud.useMasterKey(config.masterKey);
    AV.init(config);
  }

  constructor(_tableName, config) {
    super(...args);
    LeanCloudModel.connect(config);
  }

  get _pk() {
    return 'objectId';
  }

  parseWhere(className, where) {
    const instance = new AV.Query(className);
    if (think.isEmpty(where)) {
      return instance;
    }

    for (const k in where) {
      if (k === '_complex') {
        continue;
      }

      if (think.isString(where[k])) {
        instance.equalTo(k, where[k]);
        continue;
      }

      if (where[k] === undefined) {
        instance.doesNotExist(k);
      }

      if (Array.isArray(where[k])) {
        if (where[k][0]) {
          const handler = where[k][0].toUpperCase();
          switch (handler) {
            case 'IN':
              instance.containedIn(k, where[k][1]);
              break;
            case 'NOT IN':
              instance.notContainedIn(k, where[k][1]);
              break;
            case 'LIKE': {
              const first = where[k][1][0];
              const last = where[k][1].slice(-1);
              if (first === '%' && last === '%') {
                instance.contains(k, where[k][1].slice(1, -1));
              } else if (first === '%') {
                instance.endsWith(k, where[k][1].slice(1));
              } else if (last === '%') {
                instance.startsWith(k, where[k][1].slice(0, -1));
              }
              break;
            }
            case '!=':
              instance.notEqualTo(k, where[k][1]);
              break;
            case '>':
              instance.greaterThan(k, where[k][1]);
              break;
          }
        }
      }
    }
    return instance;
  }

  where(className, where) {
    if (!where._complex) {
      return this.parseWhere(className, where);
    }

    const filters = [];
    for (const k in where._complex) {
      if (k === '_logic') {
        continue;
      }

      const filter = this.parseWhere(className, {
        ...where,
        [k]: where._complex[k],
      });
      filters.push(filter);
    }

    return AV.Query[where._complex._logic](...filters);
  }

  async _select(where, { desc, limit, offset, field } = {}) {
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
    data,
    { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    const Table = AV.Object.extend(this.tableName);
    const instance = new Table();
    instance.set(data);

    const acl = new AV.ACL();
    acl.setPublicReadAccess(read);
    acl.setPublicWriteAccess(write);
    instance.setACL(acl);

    const resp = await instance.save();
    return resp.toJSON()[this._pk];
  }

  async update(data, where) {
    const instance = this.where(this.tableName, where);
    const ret = await instance.find();

    return Promise.all(
      ret.map(async (item) => {
        if (think.isFunction(data)) {
          item.set(data(item.toJSON()));
        } else {
          item.set(data);
        }

        const resp = await item.save();
        return resp.toJSON();
      })
    );
  }

  async delete(where) {
    const instance = this.where(this.tableName, where);
    const data = await instance.find();

    return AV.Object.destroyAll(data);
  }
};