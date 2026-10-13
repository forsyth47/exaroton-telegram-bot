// src/exaroton/client.ts
import { ExarotonAccount, ExarotonPool, ExarotonServer } from "../core/types.js";

export interface ExarotonClient {
  getAccount(): Promise<ExarotonAccount>;
  getServers(): Promise<ExarotonServer[]>;
  getServer(id: string): Promise<ExarotonServer>;
  getPools(): Promise<ExarotonPool[]>;
  getPool(id: string): Promise<ExarotonPool>;
}