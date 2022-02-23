const storages = require('./storage');

module.exports = function(type) {
  return tableName => (new storages[type](tableName, config));
}