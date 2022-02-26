# Dittorm

A Node.js ORM for MySQL, SQLite, PostgreSQL, MongoDB, GitHub and serverless service like Deta, InspireCloud, CloudBase, LeanCloud.

## Installation

```
npm install dittorm --save
```

## Quick Start

```js
const Model = require('dittorm')('leancloud');
const userModel = new Model('user', {
  appId: 'xxx',
  appKey: 'xxx',
  masterKey: 'xxx'
});

const user = await userModel.add({
  username: 'lizheming',
  email: 'i@imnerd.org'
});

const findUser = await user.select({email: 'i@imnerd.org'});
```

## Documentation

### Initial

#### LeanCloud

```js
const Model = require('dittorm')('leancloud');
const userModel = new Model('user', {
  appId: 'xxx',
  appKey: 'xxx',
  masterKey: 'xxx'
});
```

| Name        | Required | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `appId`     | ✅        |         |             |
| `appKey`    | ✅        |         |             |
| `masterKey` | ✅        |         |             |

#### Deta

```js
const Model = require('dittorm')('deta');
const userModel = new Model('user', {
  token: 'xxx'
});
```


| Name    | Required | Default | Description             |
| ------- | -------- | ------- | ----------------------- |
| `token` | ✅        |         | Deta project secret key |

#### InspireCloud

```js
const Model = require('dittorm')('inspirecloud');
const userModel = new Model('user', {
  serviceId: 'xxx',
  serviceSecret: 'xxx'
});
```

| Name            | Required | Default | Description                 |
| --------------- | -------- | ------- | --------------------------- |
| `serviceId`     | ✅        |         | InspireCloud Service ID     |
| `serviceSecret` | ✅        |         | InspireCloud Service Secret |
#### CloudBase

```js
const Model = require('dittorm')('cloudbase');
const userModel = new Model('user', {
  env: 'xxx',
  secretId: 'xxx',
  secretKey: 'xxx'
})
```

| Name        | Required | Default | Description                                                                              |
| ----------- | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `env`       | ✅        |         | CloudBase enviroment ID                                                                  |
| `secretId`  | ✅        |         | CloudBase API secret Id, apply it at [here](https://console.cloud.tencent.com/cam/capi)  |
| `secretKey` | ✅        |         | CloudBase API secret Key, apply it at [here](https://console.cloud.tencent.com/cam/capi) |

#### GitHub

```js
const Model = require('dittorm')('github');
const userModel = new Model('user', {
  token: 'xxx',
  repo: 'xxx',
  path: 'xxx',
})
```

| Name  | Required | Default | Description                                                                                                      |
| ----- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| token | ✅        |         | [Personal access tokens](https://github.com/settings/tokens)                                                     |
| repo  | ✅        |         | repository name, such as `walinejs/dittorm`                                                                      |
| path  |          |         | The data storage directory, such as `data` means it is stored in the `data` directory, root directory by default |


#### MySQL

```js
const Model = require('dittorm')('mysql');
const userModel = new Model('user', {
  host: '127.0.0.1',
  port: 3306,
  database: 'blog',
  user: 'admin',
  password: 'admin',
  prefix: 'dt_',
  charset: 'utf8mb4',
  dateString: true
})
```

| Name       | Required | Default   | Description           |
| ---------- | -------- | --------- | --------------------- |
| `host`     |          | 127.0.0.1 | MySQL server address  |
| `port`     |          | 3306      | MySQL server port     |
| `database` | ✅        |           | MySQL database name   |
| `user`     | ✅        |           | MySQL server username |
| `password` | ✅        |           | MySQL server password |
| `prefix`   |          |           | MySQL table prefix    |
| `charset`  |          |           | MySQL table charset   |

#### SQLite


| Name       | Required | Default | Description                                                         |
| ---------- | -------- | ------- | ------------------------------------------------------------------- |
| `path`     | ✅        |         | SQLite storage file path, not include file name                     |
| `database` |          |         | SQLite storage file name, change it if your filenamed is not waline |
| `prefix`   |          |         | SQLite table prefix                                                 |
#### PostgreSQL

```js
const Model = require('dittorm')('postgresql');
const userModel = new Model('user', {
  host: '127.0.0.1',
  post: 5432,
  database: 'blog',
  user: 'admin',
  password: 'admin',
  prefix: 'dt_',
  connectionLimit: 1,
})
```

| Name       | Required | Default   | Description                |
| ---------- | -------- | --------- | -------------------------- |
| `host`     |          | 127.0.0.1 | PostgreSQL server address  |
| `port`     |          | 3211      | PostgreSQL server port     |
| `database` | ✅        |           | PostgreSQL database name   |
| `user`     | ✅        |           | PostgreSQL server username |
| `password` | ✅        |           | PostgreSQL server password |
| `prefix`   |          |           | PostgreSQL table prefix    |
#### MongoDB

```js
const Model = require('dittorm')('mongodb');
const userModel = new Model('user', {
  host: '127.0.0.1',
  post: 5432,
  database: 'blog',
  user: 'admin',
  password: 'admin',
  options: {
    replicaset: 'xxx',
    authSource: 'admin',
    ssl: true
  }
});
```

| Name          | Required | Default   | Description                                  |
| ------------- | -------- | --------- | -------------------------------------------- |
| `host`        |          | 127.0.0.1 | MongoDB server address, support array format |
| `port`        |          | 27017     | MongoDB server port, support array format    |
| `database`    | ✅        |           | MongoDB database name                        |
| `user`        | ✅        |           | MongoDB server username                      |
| `password`    | ✅        |           | MongoDB server password                      |
| `replicaset`  |          |           | MongoDB replica set                          |
| `authSourcce` |          |           | MongoDB auth source                          |
| `ssl`         |          |           | use SSL connection                           |
### API

#### add()
#### select()

#### update()

#### count()

#### delete()