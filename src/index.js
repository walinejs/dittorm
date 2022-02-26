const storages = require('./storage');

module.exports = function(type) {
  if (!type) {
    throw Error('type is required!');
  }

  type = type.toLowerCase();
  if(!storages[type]) {
    throw Error(`${type} service not supports yet!`);
  }

  return function(tableName, config) {
    return new storages[type](tableName, config);
  }
}