const SAFE_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const EXPLICIT_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (!href) return true;
  if (CONTROL_CHARACTERS.test(href) || href.includes('\\') || href.startsWith('//')) {
    return false;
  }

  if (
    href.startsWith('/') ||
    href.startsWith('#') ||
    href.startsWith('?') ||
    href.startsWith('./') ||
    href.startsWith('../')
  ) {
    return true;
  }

  if (!EXPLICIT_PROTOCOL.test(href)) return true;

  try {
    return SAFE_HREF_PROTOCOLS.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

export function toSafeHref(value: string | undefined, fallback = '#'): string {
  return value && isSafeHref(value) ? value.trim() : fallback;
}
