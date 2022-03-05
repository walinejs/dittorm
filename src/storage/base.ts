/* eslint-disable no-unused-vars */
import { SelectOptions } from '../types/selectOption';
import { Where } from '../types/where';

export interface DittormConfigBase {
  primaryKey: string;
}

export default class<T> {
  tableName: string;
  pk: string;

  constructor(tableName: string, config: DittormConfigBase) {
    this.tableName = tableName;
    this.pk = config.primaryKey;
  }

  async select(where: Where<T>, { desc, limit, offset, field } : SelectOptions = {}): Promise<T[]> {
    //to be implemented
    return [];
  }

  async count(where: Where<T> = {}, options = {}) {
    //to be implemented
    return 0;
  }

  async add(
    data: Partial<T>,
    { access: { read = true, write = true } = { read: true, write: true } } = {}
  ) {
    //to be implemented
    return data;
  }

  async update(data: Partial<T> | ((item: T) => T), where: Where<T>): Promise<T[]> {
    //to be implemented
    return [] as T[];
  }

  async delete(where: Where<T>): Promise<void> {
    //to be implemented
  }
};