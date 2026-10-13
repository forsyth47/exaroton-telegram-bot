// src/exaroton/rest.ts
import { ExarotonClient } from "./client.js";
import { ExarotonAccount, ExarotonPool, ExarotonServer } from "../core/types.js";

export class ExarotonRestClient implements ExarotonClient {
  private baseUrl = "https://api.exaroton.com/v1";

  constructor(private token: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Exaroton API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (!json.success) throw new Error(`Exaroton API error: ${json.error}`);
    return json.data;
  }

  getAccount(): Promise<ExarotonAccount> { return this.request("/account/"); }
  getServers(): Promise<ExarotonServer[]> { return this.request("/servers/"); }
  getServer(id: string): Promise<ExarotonServer> { return this.request(`/servers/${id}`); }
  getPools(): Promise<ExarotonPool[]> { return this.request("/billing/pools/"); }
  getPool(id: string): Promise<ExarotonPool> { return this.request(`/billing/pools/${id}`); }
}