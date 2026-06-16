export interface FallbackMeta {
  _fallback?: true;
  _error?: string;
}

export async function withFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T & FallbackMeta> {
  try {
    const result = await fetcher();
    return result as T & FallbackMeta;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[stellar] ${label} failed, using fallback: ${message}`);
    const clone: unknown = Array.isArray(fallback)
      ? [...(fallback as unknown[])]
      : { ...(fallback as object) };
    (clone as FallbackMeta)._fallback = true;
    (clone as FallbackMeta)._error = message;
    return clone as T & FallbackMeta;
  }
}

export const usedFallback = (value: unknown): boolean =>
  !!(value && typeof value === "object" && (value as FallbackMeta)._fallback);
