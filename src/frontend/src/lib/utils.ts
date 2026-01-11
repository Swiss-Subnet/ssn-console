import { clsx, type ClassValue } from 'clsx';
import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parent Component type with children prop included.
 */
export type PC<T = unknown> = FC<React.PropsWithChildren<T>>;
