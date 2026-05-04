import { describe, it, expect } from 'bun:test';
import { toHrTime } from '../otlp';

describe('otlp', () => {
  describe('toHrTime', () => {
    it('converts 0 nanoseconds to hrtime correctly', () => {
      const result = toHrTime(0n);
      expect(result).toEqual([0, 0]);
    });

    it('converts exactly 1 second in nanoseconds to hrtime correctly', () => {
      const result = toHrTime(1_000_000_000n);
      expect(result).toEqual([1, 0]);
    });

    it('converts a complex nanosecond value to hrtime correctly', () => {
      // 2 seconds and 500,000,000 nanoseconds
      const result = toHrTime(2_500_000_000n);
      expect(result).toEqual([2, 500_000_000]);
    });
  });
});
