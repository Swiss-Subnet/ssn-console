import { IDL } from '@icp-sdk/core/candid';
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

export function decodeCandid<T>(types: IDL.Type[], data: Uint8Array): T | null {
  const returnValues = IDL.decode(types, data);

  switch (returnValues.length) {
    case 0:
      return null;
    case 1:
      return returnValues[0] as T;
    default:
      return returnValues as T;
  }
}
