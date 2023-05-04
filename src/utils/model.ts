import Dittorm from "..";
import type { IStorages } from "../storage";

/**
 * A Quick Model function which'll get model config from process.env automatically
 */
interface StorageConfigItem {
  condition: boolean;
  config: Record<string, any>;
}
type StorageConfig = Record<keyof IStorages, StorageConfigItem>;

function getConfigFromEnv(envs: NodeJS.ProcessEnv = {}) {
  const storageConfig: StorageConfig= {
    leancloud: {
      condition: Boolean(envs.LEAN_KEY),
      config: {
        appId: envs.LEAN_ID,
        appKey: envs.LEAN_KEY,
        masterKey: envs.LEAN_MASTER_KEY,
        serverURL: envs.LEAN_SERVER,
      }
    },
    cloudbase: {
      condition: Boolean(envs.TCB_ENV),
      config: {
        env: envs.TCB_ENV,
        secretId: envs.TCB_ID,
        secretKey: envs.TCB_KEY,
      }
    },
    deta: {
      condition: Boolean(envs.DETA_PROJECT_KEY),
      config: {
        token: envs.DETA_PROJECT_KEY,
      }
    },
    mongodb: {
      condition: Boolean(envs.MONGO_DB),
      config: {
        host: envs.MONGO_HOST
              ? envs.MONGO_HOST.startsWith('[')
                ? JSON.parse(envs.MONGO_HOST)
                : envs.MONGO_HOST
              : '127.0.0.1',
        port: envs.MONGO_PORT
              ? envs.MONGO_PORT.startsWith('[')
                ? JSON.parse(envs.MONGO_PORT)
                : envs.MONGO_PORT
              : 27017,
        user: envs.MONGO_USER,
        password: envs.MONGO_PASSWORD,
        database: envs.MONGO_DB,
        options: (function() {
                    try {
                      return JSON.parse(envs.MONGO_OPTIONS);
                    } catch(e) {
                      return {};
                    }
                  })(),
      }
    },
    mysql: {
      condition: Boolean(envs.MYSQL_DB),
      config: {
        host: envs.MYSQL_HOST || '127.0.0.1',
        port: envs.MYSQL_PORT || '3306',
        database: envs.MYSQL_DB,
        user: envs.MYSQL_USER,
        password: envs.MYSQL_PASSWORD,
        prefix: envs.MYSQL_PREFIX || '',
        charset: envs.MYSQL_CHARSET || 'utf8mb4',
        ssl: envs.MYSQL_SSL === 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : null,
      }
    },
    postgresql: {
      condition: Boolean(envs.POSTGRES_DATABASE),
      config: {
        user: envs.POSTGRES_USER,
        password: envs.POSTGRES_PASSWORD,
        database: envs.POSTGRES_DATABASE,
        host: envs.POSTGRES_HOST || '127.0.0.1',
        port: envs.POSTGRES_PORT || '5432',
        connectionLimit: 1,
        prefix: envs.POSTGRES_PREFIX || '',
        ssl: (envs.POSTGRES_SSL) == 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : null,
      }
    },
    sqlite: {
      condition: Boolean(envs.SQLITE_PATH),
      config: {
        path: envs.SQLITE_PATH,
        database: envs.SQLITE_DB,
        connectionLimit: 1,
        prefix: envs.SQLITE_PREFIX,
      }
    },
    github: {
      condition: Boolean(envs.GITHUB_REPO),
      config: {
        repo: envs.GITHUB_REPO,
        token: envs.GITHUB_TOKEN,
        path: envs.GITHUB_PATH,
      }
    },
    inspirecloud: {
      condition: false,
      config: {}
    },
  };


  const storage = (Object.keys(storageConfig) as (keyof IStorages)[]).find(storage => storageConfig[storage as keyof IStorages].condition);
  if (!storage) {
    return {};
  }

  return {
    type: storage,
    config: storageConfig[storage as keyof IStorages].config,
  }
}

export default function Model(modelName: string, injectConfig: Record<string, any> = {}, envs = process.env) {
  const { type, config } = getConfigFromEnv(envs);
  if (!type) {
    throw new Error('We haven\'t detect storage service in your environment. You should set one storage at least!');
  }

  const dittorm = Dittorm(type);
  return dittorm(modelName, { ...config, ...injectConfig } as unknown as any);
}