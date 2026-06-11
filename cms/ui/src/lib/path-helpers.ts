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
 * Convert a camelCase / kebab-case key to a human-readable Spanish label.
 */
export function formatLabel(key: string): string {
  if (!key) return "";
  if (specialLabels[key]) return specialLabels[key];
  return key
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Spanish labels with proper accents. Keys here are the JSON field names
// used across cms/src/content/schemas.ts. Anything missing falls back to a
// title-cased version of the key.
const specialLabels: Record<string, string> = {
  // ── Metadata ────────────────────────────────────
  meta: "Metadatos",
  defaultDescription: "Descripción por defecto",
  brandDescription: "Descripción de marca",
  siteName: "Nombre del sitio",
  siteUrl: "URL del sitio",
  copyrightText: "Texto de copyright",
  trademarkNote: "Nota de marca",
  trademarkUrl: "URL de marca",
  lang: "Idioma",
  locale: "Configuración regional",

  // ── Section structure ───────────────────────────
  header: "Encabezado",
  hero: "Sección principal",
  body: "Cuerpo",
  footer: "Pie de página",
  sections: "Secciones",
  blocks: "Bloques",
  components: "Componentes",
  pages: "Páginas",
  tabs: "Pestañas",
  fields: "Campos",
  form: "Formulario",
  notification: "Notificación",
  info: "Información",
  brand: "Marca",
  footerColumns: "Columnas del pie de página",
  internationalLinks: "Enlaces internacionales",
  international: "Internacional",
  socialLinks: "Redes sociales",
  links: "Enlaces",
  link: "Enlace",
  href: "Enlace (URL)",

  // ── Titles & text ───────────────────────────────
  title: "Título",
  heading: "Título",
  headline: "Titular",
  headingPrefix: "Inicio del título",
  headingHighlight: "Parte destacada del título",
  headingEmphasis: "Texto destacado",
  headingSuffix: "Final del título",
  subtitle: "Subtítulo",
  subtitlePrimary: "Subtítulo principal",
  subtitleSecondary: "Subtítulo secundario",
  description: "Descripción",
  desc: "Descripción",
  intro: "Introducción",
  outro: "Cierre",
  text: "Texto",
  content: "Contenido",
  paragraphs: "Párrafos",
  paragraph: "Párrafo",
  welcomeText: "Texto de bienvenida",
  message: "Mensaje",
  instruction: "Instrucción",
  tip: "Consejo",
  suffix: "Sufijo",

  // ── Tags / labels ───────────────────────────────
  tag: "Etiqueta",
  sectionTag: "Etiqueta de sección",
  kicker: "Etiqueta lateral",
  eyebrow: "Etiqueta superior",
  badge: "Insignia",
  label: "Etiqueta",
  asideText: "Texto lateral",

  // ── Numbers / values ────────────────────────────
  number: "Número",
  num: "Número",
  value: "Valor",
  values: "Valores",
  range: "Rango",
  age: "Edad",
  stats: "Estadísticas",

  // ── Buttons / CTAs ──────────────────────────────
  linkLabel: "Texto del enlace",
  linkHref: "URL del enlace",
  linkText: "Texto del enlace",
  buttonLabel: "Texto del botón",
  buttonHref: "URL del botón",
  ctaLabel: "Texto del llamado a la acción",
  ctaHref: "URL del llamado a la acción",
  submitLabel: "Texto del botón de envío",
  disabledButton: "Botón deshabilitado",
  readMoreLabel: "Texto de \"Leer más\"",
  backLabel: "Texto de \"Volver\"",
  skipLinkText: "Texto del enlace de saltar",

  // ── Navigation ──────────────────────────────────
  slug: "Slug (URL)",
  navLabel: "Texto en el menú",
  showInHeader: "Mostrar en el menú",
  showInFooter: "Mostrar en el pie",
  enabled: "Activado",
  afterSectionId: "Después de la sección (ID)",

  // ── Forms ───────────────────────────────────────
  placeholder: "Texto de ayuda",
  options: "Opciones",
  disclaimer: "Aviso legal",
  question: "Pregunta",
  answer: "Respuesta",
  emptyState: "Estado vacío",

  // ── Variants / styles ───────────────────────────
  type: "Tipo",
  variant: "Variante",
  status: "Estado",
  style: "Estilo visual",
  color: "Color",
  cardPalette: "Paleta de tarjetas",

  // ── Visuals ─────────────────────────────────────
  icon: "Icono",
  image: "Imagen",
  src: "Imagen",
  alt: "Texto alternativo",
  logo: "Logo",
  emoji: "Emoji",
  mediaType: "Tipo de recurso visual",
  imageKey: "Clave de imagen",
  mascot: "Mascota",
  slides: "Diapositivas",

  // ── People / entities ───────────────────────────
  name: "Nombre",
  acronym: "Sigla",
  location: "Ubicación",
  role: "Rol",
  author: "Autor",
  authorUrl: "URL del autor",
  defaultAuthor: "Autor por defecto",
  email: "Correo electrónico",
  audience: "Audiencia",

  // ── Layout / collections ────────────────────────
  columns: "Columnas",
  rows: "Filas",
  cards: "Tarjetas",
  items: "Elementos",
  categories: "Categorías",
  steps: "Pasos",
  requirements: "Requisitos",
  tableHeaders: "Encabezados de tabla",
  summaryCards: "Tarjetas de resumen",
  summaryColumns: "Columnas del resumen",

  // ── Other ───────────────────────────────────────
  id: "ID",
  docentes: "Docentes",
  estudiantes: "Estudiantes",
};

// Short help texts shown under specific fields whose meaning isn't obvious to
// a non-technical editor. Keyed by the JSON field name. Missing keys → no help.
const fieldHelp: Record<string, string> = {
  headingPrefix: "La primera parte del título, en color normal.",
  headingEmphasis: "La parte del título que se resalta con color.",
  headingSuffix: "La parte final del título, después de lo resaltado.",
  headingHighlight: "La palabra o frase del título que se muestra resaltada.",
  kicker: "Texto pequeño que aparece al lado de la sección, como una nota.",
  asideText: "Texto secundario que acompaña la sección en un lateral.",
  eyebrow: "Texto pequeño que aparece encima del título principal.",
  tag: "Etiqueta corta que se muestra arriba del título de la sección.",
  sectionTag: "Etiqueta corta que identifica la sección.",
  cardPalette: "Colores que se asignan a las tarjetas, en orden.",
  mediaType: "Define si las tarjetas muestran un icono, una imagen, un número o nada.",
  imageKey: "Selecciona cuál de las imágenes disponibles se usa.",
  slug: "Parte final de la dirección web (URL) de la página. Solo minúsculas y guiones.",
  href: "Dirección a la que lleva el enlace. Puede ser interna (/registro) o externa (https://...).",
  showInHeader: "Si está activado, la página aparece en el menú superior.",
  placeholder: "Texto gris de ejemplo que se ve dentro del campo antes de escribir.",
  columns: "Cuántas columnas ocupan las tarjetas en pantallas grandes.",
};

/**
 * Optional help text for a field, by its key. Returns "" when none is defined.
 */
export function getFieldHelp(key: string): string {
  return fieldHelp[key] || "";
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
