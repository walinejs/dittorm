import storages, { IStorages } from './storage';

function Dittorm<K extends keyof typeof storages>(type: K) {
  if (!type) {
    throw Error('type is required!');
  }

  if(!storages[type]) {
    throw Error(`${type} service not supports yet!`);
  }

  return function<T>(tableName: string, config: ConstructorParameters<IStorages[K]>[1]) {
    config.primaryKey = config.primaryKey || 'id';
    return new storages[type]<T>(tableName, config as never);
  }
}

export default Dittorm;