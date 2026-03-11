export type RouteParamValue = string | string[] | undefined | null;

export function firstParam(value: RouteParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

export function getStringParam(
  params: Record<string, unknown>,
  key: string,
): string | undefined {
  return firstParam(params[key] as RouteParamValue);
}

export function getStringParamFallback(
  params: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const v = getStringParam(params, key);
    if (v) return v;
  }
  return undefined;
}

export function getJsonParam<T>(
  params: Record<string, unknown>,
  key: string,
): T | undefined {
  const raw = getStringParam(params, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

