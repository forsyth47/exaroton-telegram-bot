export enum ServerStatus {
  OFFLINE = 0,
  ONLINE = 1,
  STARTING = 2,
  STOPPING = 3,
  RESTARTING = 4,
  SAVING = 5,
  LOADING = 6,
  CRASHED = 7,
  PENDING = 8,
  TRANSFERRING = 9,
  PREPARING = 10,
}

const LABELS: Record<number, { emoji: string; label: string }> = {
  0: { emoji: '⚫', label: 'Offline' },
  1: { emoji: '🟢', label: 'Online' },
  2: { emoji: '🟡', label: 'Starting' },
  3: { emoji: '🟠', label: 'Stopping' },
  4: { emoji: '🔁', label: 'Restarting' },
  5: { emoji: '💾', label: 'Saving' },
  6: { emoji: '⏳', label: 'Loading' },
  7: { emoji: '🔴', label: 'Crashed' },
  8: { emoji: '⏳', label: 'Pending' },
  9: { emoji: '📦', label: 'Transferring' },
  10: { emoji: '🛠️', label: 'Preparing' },
};

// STOPPING counts as active: the server is still running and still billing.
const SESSION_ACTIVE = new Set<number>([
  ServerStatus.STARTING, ServerStatus.ONLINE, ServerStatus.STOPPING,
  ServerStatus.RESTARTING, ServerStatus.SAVING, ServerStatus.LOADING,
]);

const STOPPED_LIKE = new Set<number>([
  ServerStatus.OFFLINE, ServerStatus.CRASHED, ServerStatus.PENDING,
  ServerStatus.TRANSFERRING, ServerStatus.PREPARING,
]);

export const isSessionActive = (s: number) => SESSION_ACTIVE.has(s);
export const isStoppedLike = (s: number) => STOPPED_LIKE.has(s);
export const statusInfo = (s: number) => LABELS[s] ?? { emoji: '❓', label: `Unknown (${s})` };

export type ServerAction = 'start' | 'stop' | 'restart';

/** Pure guard. Also enforced server-side before any API call. */
export function evaluateAction(status: number, action: ServerAction): { allowed: boolean; message?: string } {
  const deny = (message: string) => ({ allowed: false, message });

  switch (action) {
    case 'start':
      if (status === ServerStatus.ONLINE) return deny('The server is already running.');
      if (status === ServerStatus.STARTING) return deny('The server is already starting.');
      if (status === ServerStatus.RESTARTING) return deny('The server is already restarting.');
      if (status === ServerStatus.STOPPING) return deny('The server is shutting down. Wait until it is offline, then start it.');
      return { allowed: true };

    case 'stop':
      if (status === ServerStatus.OFFLINE) return deny('The server is already stopped.');
      if (status === ServerStatus.CRASHED) return deny('The server has already crashed. Nothing to stop.');
      if (status === ServerStatus.STOPPING) return deny('The server is already stopping.');
      if (status === ServerStatus.PENDING || status === ServerStatus.PREPARING || status === ServerStatus.TRANSFERRING)
        return deny('The server is not running yet. Wait for preparation to finish.');
      return { allowed: true };

    case 'restart':
      if (status === ServerStatus.OFFLINE) return deny('The server is offline. Use ▶️ Start instead.');
      if (status === ServerStatus.CRASHED) return deny('The server has crashed. Use ▶️ Start instead.');
      if (status === ServerStatus.STARTING) return deny('The server is still starting. Wait until it is online.');
      if (status === ServerStatus.STOPPING) return deny('The server is stopping. Wait until it is offline, then start it.');
      if (status === ServerStatus.RESTARTING) return deny('The server is already restarting.');
      return { allowed: true };
  }
}