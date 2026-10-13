// src/monitoring/player-diff.ts
export function calculatePlayerDiff(prev: Set<string>, curr: Set<string>) {
  const joined = [...curr].filter(p => !prev.has(p));
  const left = [...prev].filter(p => !curr.has(p));
  return { joined, left };
}