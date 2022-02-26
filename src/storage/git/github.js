const { request } = require('undici');
const path = require('path');
const Base = require('./base');

class GitHub {
  constructor(repo, token) {
    this.token = token;
    this.repo = repo;
  }

  // content api can only get file < 1MB
  async get(filename) {
    const url = 'https://api.github.com/repos/' +
    path.join(this.repo, 'contents', filename);

    const resp = await request(url, {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: 'token ' + this.token,
        'user-agent': 'Waline',
      }
    }).then(resp => resp.body.json()).catch((e) => {
      const isTooLarge = e.message.includes('"too_large"');
      if (!isTooLarge) {
        throw e;
      }
      return this.getLargeFile(filename);
    });

    return {
      data: Buffer.from(resp.content, 'base64').toString('utf-8'),
      sha: resp.sha,
    };
  }

  // blob api can get file larger than 1MB
  async getLargeFile(filename) {
    const url = 'https://api.github.com/repos/' +
    path.join(this.repo, 'git/trees/HEAD') +
    '?recursive=1';

    const { tree } = await request(url, {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: 'token ' + this.token,
        'user-agent': 'Waline',
      },
    }).then(resp => resp.body.json());

    const file = tree.find(({ path }) => path === filename);
    if (!file) {
      const error = new Error('NOT FOUND');
      error.statusCode = 404;
      throw error;
    }

    return request(file.url, {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: 'token ' + this.token,
        'user-agent': 'Waline',
      },
    }).then(resp => resp.body.text());
  }

  async set(filename, content, { sha }) {
    const url = 'https://api.github.com/repos/' +
    path.join(this.repo, 'contents', filename);

    return request(url, {
      method: 'PUT',
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: 'token ' + this.token,
        'user-agent': 'Waline',
      },
      body: JSON.stringify({
        sha,
        message: 'feat(robot): update data',
        content: Buffer.from(content, 'utf-8').toString('base64'),
      }),
    });
  }
}

module.exports = class GitHubModel extends Base {
  constructor(tableName, config) {
    super(tableName, config);
    this.git = new GitHub(config.repo, config.token);
    this.basePath = config.path;
  }
}