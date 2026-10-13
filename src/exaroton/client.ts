import { ExarotonAccount, ExarotonPool, ExarotonServer } from '../core/types.js';

export interface ExarotonClient {
  getAccount(): Promise<ExarotonAccount>;
  getServers(): Promise<ExarotonServer[]>;
  getServer(id: string): Promise<ExarotonServer>;
  getPools(): Promise<ExarotonPool[]>;
  getPool(id: string): Promise<ExarotonPool>;
  getPoolServers(id: string): Promise<ExarotonServer[]>;
  startServer(id: string): Promise<void>;
  stopServer(id: string): Promise<void>;
  restartServer(id: string): Promise<void>;
}