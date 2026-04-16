const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;

export function minutesToMilliseconds(minutes: number): number {
  return minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
}

export function hoursToMilliseconds(hours: number): number {
  return minutesToMilliseconds(hours * MINUTES_PER_HOUR);
}

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
export function millisecondsToNanoseconds(milliseconds: number): bigint {
  return BigInt(milliseconds) * BigInt(NANOSECONDS_PER_MILLISECOND);
}
