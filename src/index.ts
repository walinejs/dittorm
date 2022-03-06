import storages from './storage';

type StorageTypes = keyof typeof storages;
module.exports = function(_type: StorageTypes) {
  if (!_type) {
    throw Error('type is required!');
  }

  const type = _type.toLowerCase() as StorageTypes;
  const storage = storages[type];

  if(!storage) {
    throw Error(`${type} service not supports yet!`);
  }

  return function(tableName: string, config: ConstructorParameters<typeof storage>[1]) {
    config.primaryKey = config.primaryKey || 'id';
    //@ts-ignore
    return new storage(tableName, config);
  }
}