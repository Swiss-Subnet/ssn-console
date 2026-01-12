import { clsx, type ClassValue } from 'clsx';
import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Parent Component type with children prop included.
 */
export type PC<T = unknown> = FC<React.PropsWithChildren<T>>;

export function fromCandidOpt<T>(opt: [] | [T]): T | null {
  return opt.length === 0 ? null : opt[0];
}

export function toCandidOpt<T>(value: T | null | undefined): [] | [T] {
  return value == null ? [] : [value];
}
