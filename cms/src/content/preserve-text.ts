function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function shouldPreservePreviousString(next: string, previous: string): boolean {
  return next !== previous && stripDiacritics(next) === stripDiacritics(previous);
}

export function preserveDiacritics<T>(next: T, previous: unknown): T {
  if (typeof next === "string" && typeof previous === "string") {
    return (shouldPreservePreviousString(next, previous) ? previous : next) as T;
  }

  if (Array.isArray(next)) {
    if (!Array.isArray(previous)) return next;
    return next.map((item, idx) => preserveDiacritics(item, previous[idx])) as T;
  }

  if (next && typeof next === "object") {
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) return next;

    const previousRecord = previous as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(next as Record<string, unknown>).map(([key, value]) => [
        key,
        preserveDiacritics(value, previousRecord[key]),
      ])
    ) as T;
  }

  return next;
}
