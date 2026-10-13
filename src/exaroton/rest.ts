import { ExarotonClient } from './client.js';
import { ExarotonAccount, ExarotonPool, ExarotonServer } from '../core/types.js';

export class ExarotonApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ExarotonApiError';
  }
}

export class ExarotonRestClient implements ExarotonClient {
  private baseUrl = 'https://api.exaroton.com/v1';

  constructor(private token: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      // Never interpolate the token or raw auth headers into errors.
      const message =
        res.status === 401 ? 'Invalid or revoked Exaroton API token.' :
        res.status === 403 ? 'This token does not have access to that resource.' :
        res.status === 404 ? 'Resource not found.' :
        res.status === 429 ? 'Exaroton rate limit reached. Try again shortly.' :
        `Exaroton API returned HTTP ${res.status}.`;
      throw new ExarotonApiError(res.status, message);
    }

    const json = await res.json();
    if (!json.success) throw new ExarotonApiError(res.status, json.error ?? 'Unknown API error');
    return json.data as T;
  }

  getAccount() { return this.request<ExarotonAccount>('/account/'); }
  getServers() { return this.request<ExarotonServer[]>('/servers/'); }
  getServer(id: string) { return this.request<ExarotonServer>(`/servers/${id}`); }
  getPools() { return this.request<ExarotonPool[]>('/billing/pools/'); }
  getPool(id: string) { return this.request<ExarotonPool>(`/billing/pools/${id}`); }
  getPoolServers(id: string) { return this.request<ExarotonServer[]>(`/billing/pools/${id}/servers/`); }

  startServer(id: string) { return this.request<void>(`/servers/${id}/start/`); }
  stopServer(id: string) { return this.request<void>(`/servers/${id}/stop/`); }
  restartServer(id: string) { return this.request<void>(`/servers/${id}/restart/`); }
}