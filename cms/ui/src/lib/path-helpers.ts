// ── Path helpers — pure utility functions extracted from editor.js ──

/**
 * Parse a dot/bracket path like "foo.bar[0].baz" into an array of keys.
 */
export function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const regex = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      parts.push(match[1]);
    } else if (match[2] !== undefined) {
      parts.push(parseInt(match[2], 10));
    }
  }
  return parts;
}

/**
 * Retrieve a deeply nested value from `obj` using a dot/bracket path.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = parsePath(path);
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Set a deeply nested value in `obj`, auto-creating intermediate objects/arrays.
 */
export function setNestedValue(obj: unknown, path: string, value: unknown): void {
  const parts = parsePath(path);
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null) {
      current[part] = typeof parts[i + 1] === "number" ? [] : {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Escape a string for safe insertion inside a `<pre>` element.
 */
export function escapeForPre(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert a CSS color string to a hex color usable in `<input type="color">`.
 */
export function toHexColor(str: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
  if (/^#[0-9a-fA-F]{3}$/.test(str)) {
    return "#" + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
  }
  try {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = str;
    return ctx.fillStyle;
  } catch {
    return "#000000";
  }
}

/**
 * Convert a camelCase / kebab-case key to a human-readable label.
 */
export function formatLabel(key: string): string {
  if (!key) return "";
  return key
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate a slug that doesn't collide with existing page slugs.
 */
export function generateUniqueSlug(data: any, base: string): string {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const used = new Set(pages.map((p: any) => p.slug));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
