export const isNil = <T = unknown>(
  value: T | null | undefined,
): value is null | undefined => {
  return value === null || value === undefined;
};

export const isNotNil = <T = unknown>(
  value: T | null | undefined,
): value is T => {
  return value !== null && value !== undefined;
};
