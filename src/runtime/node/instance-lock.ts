import {
  closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Fail closed if another instance owns this database.
 * Prevents orphaned dev processes from creating a second Telegram poller.
 */
export function acquireInstanceLock(lockPath: string): () => void {
  const absolute = resolve(lockPath);
  mkdirSync(dirname(absolute), { recursive: true });

  let fd: number;

  try {
    fd = openSync(absolute, 'wx');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;

    const raw = readFileSync(absolute, 'utf8').trim();
    const pid = Number.parseInt(raw, 10);
    let stale = false;

    if (Number.isFinite(pid) && pid > 0 && pid !== process.pid) {
      try {
        process.kill(pid, 0); // existence check only; does not send a signal
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') stale = true;
        else throw e; // EPERM = alive, owned by someone else. Do not steal it.
      }
    } else {
      stale = true; // empty or corrupt lock file
    }

    if (!stale) {
      throw new Error(
        `Another bot instance is already running (PID ${pid}). ` +
        `Stop it before starting this one. Lock file: ${absolute}`
      );
    }

    unlinkSync(absolute);
    fd = openSync(absolute, 'wx');
  }

  writeSync(fd, String(process.pid));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { closeSync(fd); } catch { /* already closed */ }
    try { unlinkSync(absolute); } catch { /* already removed */ }
  };

  process.once('exit', release);
  return release;
}