const e = name => process.env[name];
module.exports = {
  leancloud: {
    appId: e('LEANCLOUD_APPID'),
    appKey: e('LEANCLOUD_APPKEY'),
    masterKey: e('LEANCLOUD_MASTERKEY'),
  },
  cloudbase: {
    env: e('CLOUDBASE_ENV'),
    secretId: e('CLOUDBASE_SECRETID'),
    secretKey: e('CLOUDBASE_SECRETKEY'),
  },
  inspirecloud: {
    serviceId: e('INSPIRECLOUD_SERVICEID'),
    serviceSecret: e('INSPIRECLOUD_SERVICESECRET')
  },
  deta: {
    token: e('DETA_TOKEN')
  },
  github: {
    token: e('GITHUB_TOKEN'),
    repo: e('GITHUB_REPO'),
    path: e('GITHUB_PATH'),
  },
  mongodb: {
    host: JSON.parse(e('MONGODB_HOST')),
    port: JSON.parse(e('MONGODB_PORT')),
    database: e('MONGODB_DATABASE'),
    user: e('MONGODB_USER'),
    password: e('MONGODB_PASSWORD'),
    options: {
      replicaset: e('MONGODB_OPTIONS_REPLICASET'),
      authSource: e('MONGODB_OPTIONS_AUTHSOURCE'),
      ssl: true,
    },
  },
  mysql: {
    host: e('MYSQL_HOST'),
    port: e('MYSQL_PORT'),
    database: e('MYSQL_DATABASE'),
    user: e('MYSQL_USER'),
    password: e('MYSQL_PASSWORD'),
    prefix: e('MYSQL_PREFIX'),
    charset: e('MYSQL_CHARSET'),
    dateString: true,
  },
  postgresql: {
    user: e('POSTGRESQL_USER'),
    password: e('POSTGRESQL_PASSWORD'),
    database: e('POSTGRESQL_DATABASE'),
    host: e('POSTGRESQL_HOST'),
    port: e('POSTGRESQL_PORT'),
    connectionLimit: e('POSTGRESQL_CONNECTIONLIMIT'),
    prefix: e('POSTGRESQL_PREFIX')
  },
};