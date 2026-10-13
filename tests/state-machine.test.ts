import { describe, it, expect } from 'vitest';
import {
  ServerStatus, evaluateAction, isSessionActive, isStoppedLike,
} from '../src/monitoring/state-machine.js';

describe('Status classification', () => {
  it('treats STOPPING as an active session (still billing)', () => {
    expect(isSessionActive(ServerStatus.STOPPING)).toBe(true);
    expect(isStoppedLike(ServerStatus.STOPPING)).toBe(false);
  });

  it('treats OFFLINE and CRASHED as stopped', () => {
    expect(isStoppedLike(ServerStatus.OFFLINE)).toBe(true);
    expect(isStoppedLike(ServerStatus.CRASHED)).toBe(true);
  });
});

describe('Control guards', () => {
  it('rejects Start when already online', () => {
    const r = evaluateAction(ServerStatus.ONLINE, 'start');
    expect(r.allowed).toBe(false);
    expect(r.message).toMatch(/already running/);
  });

  it('rejects Stop when already offline', () => {
    expect(evaluateAction(ServerStatus.OFFLINE, 'stop').allowed).toBe(false);
  });

  it('rejects Restart when offline', () => {
    const r = evaluateAction(ServerStatus.OFFLINE, 'restart');
    expect(r.allowed).toBe(false);
    expect(r.message).toMatch(/Start/);
  });

  it('rejects Restart while starting', () => {
    expect(evaluateAction(ServerStatus.STARTING, 'restart').allowed).toBe(false);
  });

  it('allows Stop on a running server', () => {
    expect(evaluateAction(ServerStatus.ONLINE, 'stop').allowed).toBe(true);
  });

  it('allows Start on a crashed server', () => {
    expect(evaluateAction(ServerStatus.CRASHED, 'start').allowed).toBe(true);
  });
});