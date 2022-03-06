import storages from './storage';

type StorageTypes = keyof typeof storages;

export default function(_type: StorageTypes) {
  if (!_type) {
    throw Error('type is required!');
  }

  const type = _type.toLowerCase() as StorageTypes;
  const storage = storages[type];

  if(!storage) {
    throw Error(`${type} service not supports yet!`);
  }

  return function<T>(tableName: string, config: ConstructorParameters<typeof storage>[1]) {
    config.primaryKey = config.primaryKey || 'id';
    //@ts-ignore
    return new storage<T>(tableName, config);
  }
}