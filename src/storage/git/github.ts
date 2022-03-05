import { request } from 'undici';
import path from 'path';
import Base, { GitInstance } from './base';
import { DittormConfigBase } from '../base';

class GitHub<T> implements GitInstance<T> {
  token: string;
  repo: string;

  constructor(repo: string, token: string) {
    this.token = token;
    this.repo = repo;
  }

  // content api can only get file < 1MB
  async get(filename: string) {
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
  async getLargeFile(filename: string) {
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

    const file = tree.find(({ path }: { path: string}) => path === filename);
    if (!file) {
      const error = new Error('NOT FOUND');
      //@ts-ignore
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

  async set(filename: string, content: string, { sha }: { sha?: string}) {
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

export type GitHubModelConfig = ({repo: string, token: string, path?: string}) & DittormConfigBase;

export default class GitHubModel<T> extends Base<T> {
  constructor(tableName: string, config: GitHubModelConfig) {
    super(tableName, config);
    this.git = new GitHub<T>(config.repo, config.token);
    this.basePath = config.path || './';
  }
}