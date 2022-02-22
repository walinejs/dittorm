const services = require('./services');

module.exports = function(type, config) {
  return tableName => (new service[type](config, tableName));
}