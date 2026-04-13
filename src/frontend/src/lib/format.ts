export function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(n) / Math.log(1024)),
    units.length - 1,
  );
  const value = n / Math.pow(1024, i);
  return `${i === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[i]}`;
}

export function formatCycles(cycles: bigint): string {
  if (cycles === 0n) return '0';
  const thresholds: [bigint, string][] = [
    [1_000_000_000_000n, 'T'],
    [1_000_000_000n, 'B'],
    [1_000_000n, 'M'],
    [1_000n, 'K'],
  ];
  for (const [threshold, suffix] of thresholds) {
    if (cycles >= threshold) {
      return `${(Number(cycles) / Number(threshold)).toFixed(2)} ${suffix}`;
    }
  }
  return cycles.toString();
}

export function formatNumber(value: bigint): string {
  return value.toLocaleString();
}

export function formatTimestamp(nanos: bigint): string {
  return new Date(Number(nanos / 1_000_000n)).toLocaleString();
}

export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s === 0) return '0 s';
  const units: [number, string][] = [
    [86400 * 365, 'y'],
    [86400 * 30, 'mo'],
    [86400 * 7, 'w'],
    [86400, 'd'],
    [3600, 'h'],
    [60, 'min'],
    [1, 's'],
  ];
  for (const [divisor, label] of units) {
    if (s >= divisor) {
      const value = s / divisor;
      return `${Number.isInteger(value) ? value : value.toFixed(1)} ${label}`;
    }
  }
  return `${s} s`;
}

export function formatHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
