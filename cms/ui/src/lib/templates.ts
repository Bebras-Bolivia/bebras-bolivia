// ── Templates & config — extracted from editor.js ──
// Contains all static configuration, component option maps, typed item
// factories, and field-type resolution logic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

import { getNestedValue } from "./path-helpers";

// ── Route mapping ────────────────────────────────────────
export const fileToPage: Record<string, string> = {
  "home.json": "/",
  "categories.json": "/",
  "scoring.json": "/",
  "faq.json": "/faq/",
  "teacher-instructions.json": "/maestros/",
  "sponsors.json": "/sponsors/",
  "contact.json": "/contacto/",
  "registro.json": "/registro/",
  "estudiantes.json": "/estudiantes/",
  "docentes.json": "/maestros/",
  "blog-ui.json": "/blog/",
};

// ── Field hints ──────────────────────────────────────────
export const fieldHints: Record<string, string> = {
  href: "url",
  siteUrl: "url",
  trademarkUrl: "url",
  linkHref: "url",
  buttonHref: "url",
  ctaHref: "url",
  link: "url",
  image: "text",
  src: "text",
  defaultDescription: "textarea",
  subtitle: "textarea",
  body: "textarea",
  description: "textarea",
  paragraph: "textarea",
  answer: "textarea",
  desc: "textarea",
  intro: "textarea",
  outro: "textarea",
  tip: "textarea",
  text: "textarea",
  pageDescription: "textarea",
  headingHighlight: "text",
  instruction: "textarea",
  disclaimer: "textarea",
  content: "textarea",
  brandDescription: "textarea",
  copyrightText: "textarea",
  trademarkNote: "textarea",
  accent: "brand-color",
  color: "brand-color",
  cardPalette: "brand-color",
};

export const BRAND_COLORS = ["yellow", "red", "green", "blue", "gray"] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];

export const BRAND_COLOR_HEX: Record<BrandColor, string> = {
  yellow: "#F8AE31",
  red: "#E83B3B",
  green: "#1B8F60",
  blue: "#324C87",
  gray: "#D9D9D9",
};

export const BRAND_COLOR_LABEL: Record<BrandColor, string> = {
  yellow: "Amarillo",
  red: "Rojo",
  green: "Verde",
  blue: "Azul",
  gray: "Gris",
};

// ── Select field options ─────────────────────────────────
export const selectOptions: Record<string, string[]> = {
  variant: ["button", "link"],
  style: ["primary", "secondary"],
  status: ["positive", "neutral", "negative"],
  icon: ["monitor", "wifi", "user", "clock", "email", "clipboard", "share", "school", "brain"],
  imageKey: ["guacamayo", "capibara", "titi", "jucumari", "yaguarete"],
};

// ── Hidden fields ────────────────────────────────────────
// `type` is the block/section discriminator (introEditorial, itemsGrid, …) —
// editing it would break the section, so it's never shown. `id` likewise.
export const hiddenFields = new Set(["id", "type"]);

// ── Component option type ────────────────────────────────
export type ComponentOption = {
  value: string;
  label: string;
  description: string;
};

// ── Component options for "add component" modal ──────────
const componentOptionsList: ComponentOption[] = [
  { value: "sectionRichText", label: "Seccion de Texto", description: "Titulo, parrafos y tip opcional" },
  { value: "organizerInstitution", label: "Institucion organizadora", description: "Bloque destacado de institucion o patrocinador" },
  { value: "itemsGridIcon", label: "Cuadricula con iconos", description: "Tarjetas con icono visual" },
  { value: "itemsGridImage", label: "Cuadricula con imagenes", description: "Tarjetas con imagen" },
  { value: "itemsGridNumber", label: "Cuadricula numerada", description: "Tarjetas tipo pasos numerados" },
  { value: "itemsGridSimple", label: "Cuadricula simple", description: "Tarjetas sin icono ni imagen" },
  { value: "linksList", label: "Lista de Enlaces", description: "Listado de recursos o enlaces externos" },
  { value: "featureList", label: "Lista de Caracteristicas", description: "Lista con checks y texto introductorio" },
  { value: "statsGrid", label: "Cuadricula de estadisticas", description: "Metricas en tarjetas con texto inferior" },
  { value: "studentsAgeCategories", label: "Categorias de Edad", description: "Categorias completas y editables" },
  { value: "studentsScoringTable", label: "Tabla de Puntaje", description: "Tabla completa y editable" },
  { value: "faqAccordion", label: "Preguntas frecuentes", description: "Preguntas y respuestas en acordeon" },
  { value: "tabsGuide", label: "Guia en Tabs", description: "Contenido por pestanas" },
  { value: "formContact", label: "Formulario", description: "Formulario de contacto editable" },
  { value: "blogIndex", label: "Listado del blog", description: "Estado vacio y texto Leer mas" },
  { value: "blogPostUi", label: "Detalle del blog", description: "Textos de volver y llamado a la accion" },
  { value: "contactClassic", label: "Contacto Clasico", description: "Bloque completo como diseno anterior" },
  { value: "cta", label: "CTA", description: "Bloque de titulo, texto y boton" },
];

export function getComponentOptions(path: string): ComponentOption[] {
  if (path === "components") return componentOptionsList;
  return [];
}

// ── Field type resolution ────────────────────────────────

export function shouldHideField(key: string): boolean {
  return hiddenFields.has(key);
}

// ── Section presentation: content vs. design ─────────────
// For each known section/block `type`, list the field keys that are visual
// "design" rather than content. The editor groups these under a collapsed
// "Ajustes de diseño" panel so a non-technical editor sees only what they edit.
// Keyed by the `type` discriminator on the section/card object. Field keys are
// matched on the leaf name (last path segment), so they apply at any depth
// (e.g. an item's `color` inside a section of this type).
const sectionDesignFields: Record<string, Set<string>> = {
  introEditorial: new Set(["number", "accent", "kicker", "asideText"]),
  aboutBebrasEditorial: new Set(["number", "accent", "kicker", "asideText"]),
  homeAgeCategories: new Set(["number", "accent", "kicker", "asideText", "color", "imageKey", "author", "authorUrl"]),
  homeDualCta: new Set(["style", "icon", "audience"]),
};

/**
 * Whether `key` is a design (non-content) field for a section of `type`.
 * Returns false for unknown types, so other pages are unaffected.
 */
export function isDesignField(type: string | undefined, key: string): boolean {
  if (!type) return false;
  return sectionDesignFields[type]?.has(key) ?? false;
}

/** Whether a section/block `type` has a content/design split defined. */
export function hasFieldGroups(type: string | undefined): boolean {
  return !!type && type in sectionDesignFields;
}

export function getFieldType(keyOrPath: string, value: unknown): string {
  const path = String(keyOrPath);
  if (/(^|\.)cardPalette(\[\d+\])?$/.test(path)) return "brand-color";
  const key = path.split(".").pop() || "";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (selectOptions[key]) return "select";
  if (fieldHints[key]) return fieldHints[key];
  if (typeof value === "string" && value.length > 100) return "textarea";
  return "text";
}

export function isImagePathField(path: string, value: unknown): boolean {
  if (typeof value !== "string") return false;
  const key = String(path).split(".").pop() || "";
  if (["image", "src", "logo", "icon"].includes(key)) return true;
  return value.startsWith("/images/") || value.startsWith("/api/media/file/");
}

export function isAutoNumberField(path: string, currentData: unknown): boolean {
  if (!/\.items\[\d+\]\.number$/.test(path)) return false;
  const parentPath = path.replace(/\.items\[\d+\]\.number$/, "");
  const parent: SafeAny = getNestedValue(currentData, parentPath);
  return !!(parent && parent.type === "itemsGrid" && parent.mediaType === "number");
}

export function isCollapsibleArray(path: string): boolean {
  return ["components", "sections", "pages", "blocks", "links", "footerColumns", "socialLinks", "internationalLinks"].includes(path)
    || path.endsWith(".components")
    || path.endsWith(".sections")
    || path.endsWith(".pages")
    || path.endsWith(".blocks")
    || path.endsWith(".links")
    || path.endsWith(".items")
    || path.endsWith(".cards")
    || path.endsWith(".stats")
    || path.endsWith(".categories")
    || path.endsWith(".rows")
    || path.endsWith(".summaryCards")
    || path.endsWith(".slides")
    || path.endsWith(".tabs");
}

// ── Array item labels ────────────────────────────────────

const typeLabelMap: Record<string, string> = {
  blogIndex: "Listado del blog",
  blogPostUi: "Detalle del blog",
  contactClassic: "Contacto Clasico",
  organizerInstitution: "Institucion Organizadora",
  introEditorial: "Texto editorial",
  homeAgeCategories: "Categorías por edad",
  homeDualCta: "Doble llamado a la acción",
  aboutBebrasEditorial: "Sobre Bebras",
  sectionRichText: "Texto",
  itemsGrid: "Cuadricula de tarjetas",
  linksList: "Lista de Enlaces",
  featureList: "Lista de Caracteristicas",
  statsGrid: "Cuadricula de estadisticas",
  studentsAgeCategories: "Categorias de Edad",
  studentsScoringTable: "Tabla de Puntaje",
  faqAccordion: "Preguntas frecuentes",
  tabsGuide: "Guia en Tabs",
  formContact: "Formulario",
  cta: "CTA",
};

export function getArrayItemLabel(obj: SafeAny, idx: number): string {
  if (obj && typeof obj === "object") {
    const mapped = typeLabelMap[obj.type];
    if (mapped) return `#${idx + 1} — ${mapped}`;
    if (obj.title) return `#${idx + 1} — ${obj.title}`;
    if (obj.heading) return `#${idx + 1} — ${obj.heading}`;
    if (obj.label) return `#${idx + 1} — ${obj.label}`;
    if (obj.tag) return `#${idx + 1} — ${obj.tag}`;
    if (obj.type) return `#${idx + 1} — ${obj.type}`;
  }
  return `#${idx + 1}`;
}

// ── Add-type options (for typed array pickers) ───────────

export type AddTypeOption = { value: string; label: string; description?: string };

export function getAddTypeOptions(
  path: string,
  currentFile: string,
  currentData: unknown,
): AddTypeOption[] | null {
  if (currentFile === "home.json" && path === "sections") {
    return [
      { value: "introEditorial", label: "Texto editorial", description: "Título grande y párrafos con un texto lateral." },
      { value: "homeAgeCategories", label: "Categorías por edad", description: "Cuadrícula con las categorías y sus imágenes." },
      { value: "homeDualCta", label: "Doble llamado a la acción", description: "Dos tarjetas: maestros y estudiantes." },
      { value: "aboutBebrasEditorial", label: "Sobre Bebras", description: "Bloque editorial con párrafos informativos." },
    ];
  }

  if (/\.tabs$/.test(path)) {
    const parentPath = path.replace(/\.tabs$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "tabsGuide") {
      return [{ value: "tabStep", label: "Pestana" }];
    }
  }

  if (/\.tabs\[\d+\]\.items$/.test(path)) {
    return [{ value: "tabItem", label: "Elemento de pestana" }];
  }

  if (/\.items$/.test(path)) {
    const parentPath = path.replace(/\.items$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "itemsGrid") {
      return [{ value: "gridItem", label: "Tarjeta" }];
    }
    if (parent && parent.type === "featureList") {
      return [{ value: "featureItem", label: "Item de lista" }];
    }
  }

  if (/\.categories$/.test(path)) {
    const parentPath = path.replace(/\.categories$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "studentsAgeCategories") {
      return [{ value: "ageCategoryItem", label: "Categoria" }];
    }
  }

  if (/\.rows$/.test(path)) {
    const parentPath = path.replace(/\.rows$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "studentsScoringTable") {
      return [{ value: "scoringRow", label: "Fila de tabla" }];
    }
  }

  if (/\.summaryCards$/.test(path)) {
    const parentPath = path.replace(/\.summaryCards$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "studentsScoringTable") {
      return [{ value: "scoringSummary", label: "Resumen" }];
    }
  }

  return null;
}

// ── Blank clone ──────────────────────────────────────────

export function blankClone(obj: unknown): unknown {
  if (Array.isArray(obj)) return [];
  if (typeof obj === "object" && obj !== null) {
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        clone[k] = [];
      } else if (typeof v === "object" && v !== null) {
        clone[k] = blankClone(v);
      } else {
        clone[k] = "";
      }
    }
    return clone;
  }
  return "";
}

// ── Empty array item factory ─────────────────────────────

export function createEmptyArrayItem(
  path: string,
  currentFile: string,
  currentData: unknown,
): unknown {
  const normalizedPath = String(path).replace(/\[\d+\]/g, "[]");

  if (normalizedPath.endsWith("cardPalette")) return "yellow";

  if (currentFile === "faq.json" && normalizedPath.endsWith("categories[].items")) {
    return { question: "", answer: "" };
  }

  if (normalizedPath.endsWith("tabs[].items")) {
    return { title: "", desc: "" };
  }

  if (normalizedPath.endsWith(".items")) {
    const parentPath = String(path).replace(/\.items$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "itemsGrid") {
      if (parent.mediaType === "icon") return { title: "", description: "", icon: "monitor" };
      if (parent.mediaType === "image") return { title: "", description: "", image: "/images/sponsor-placeholder.svg" };
      if (parent.mediaType === "number") return { number: "", title: "", description: "" };
      return { title: "", description: "" };
    }
  }

  // Link-shaped arrays used across contact.international.links, etc.
  // Schemas: `contact.international.links` → adds a `description` field
  if (normalizedPath.endsWith("socialLinks")) {
    return { label: "", href: "", icon: "" };
  }

  if (
    currentFile === "contact.json" &&
    normalizedPath.endsWith("international.links")
  ) {
    return { label: "", href: "", description: "" };
  }

  if (
    normalizedPath.endsWith("internationalLinks") ||
    normalizedPath.endsWith("footerColumns[].links")
  ) {
    return { label: "", href: "" };
  }

  if (normalizedPath.endsWith("footerColumns")) {
    return { title: "", links: [] };
  }

  return "";
}

// ── Typed array item factory (component templates) ───────

export function createTypedArrayItem(
  path: string,
  selectedType: string,
  currentFile: string,
  currentData: unknown,
): unknown {
  if (currentFile === "home.json" && path === "sections") {
    return _homeSection(selectedType);
  }

  // ── Shared page components ──
  if (path === "components") {
    return _componentTemplate(selectedType);
  }

  // ── Generic typed items ──
  if (selectedType === "tabStep") {
    return {
      id: `tab-${Date.now()}`,
      label: "Nueva pestana",
      heading: "Titulo de pestana",
      items: [{ title: "Nuevo punto", desc: "Descripcion" }],
    };
  }

  if (selectedType === "tabItem") {
    return { title: "Nuevo punto", desc: "Descripcion" };
  }

  if (selectedType === "gridItem") {
    const parentPath = path.replace(/\.items$/, "");
    const parent: SafeAny = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "itemsGrid") {
      if (parent.mediaType === "icon") return { title: "Nuevo item", description: "Descripcion", icon: "monitor" };
      if (parent.mediaType === "image") return { title: "Nuevo item", description: "Descripcion", image: "/images/sponsor-placeholder.svg" };
      if (parent.mediaType === "number") return { number: "", title: "Nuevo item", description: "Descripcion" };
    }
    return { title: "Nuevo item", description: "Descripcion" };
  }

  if (selectedType === "featureItem") {
    return { title: "Nueva habilidad", desc: "Descripcion" };
  }

  if (selectedType === "ageCategoryItem") {
    return { name: "Nueva categoria", age: "0-0 anos", emoji: "🧩", color: "blue", desc: "Descripcion" };
  }

  if (selectedType === "scoringRow") {
    return { label: "Nueva fila", values: ["0", "0", "0"], status: "neutral" };
  }

  if (selectedType === "scoringSummary") {
    return { value: "0", label: "Resumen" };
  }

  return null;
}
function _homeSection(type: string): unknown | null {
  const map: Record<string, () => unknown> = {
    introEditorial: () => ({
      type: "introEditorial",
      number: "01",
      kicker: "Capitulo",
      asideText: "Texto lateral de la seccion.",
      heading: "Titulo destacado",
      paragraphs: ["Parrafo principal.", "Parrafo secundario."],
    }),
    homeAgeCategories: () => ({
      type: "homeAgeCategories",
      number: "02",
      kicker: "Categorias",
      asideText: "Descripcion lateral.",
      heading: "Categorias por edad",
      linkLabel: "Ver mas",
      linkHref: "/estudiantes",
      items: [
        { name: "Guacamayo", range: "5 a 8 anos", color: "red", imageKey: "guacamayo", author: "Autor", authorUrl: "https://example.com" },
      ],
    }),
    homeDualCta: () => ({
      type: "homeDualCta",
      cards: [
        { audience: "Maestros", style: "primary", icon: "school", headingPrefix: "Titulo", headingEmphasis: "destacado", headingSuffix: "final", linkLabel: "Ver mas", href: "/registro" },
        { audience: "Estudiantes", style: "secondary", icon: "brain", headingPrefix: "Titulo", headingEmphasis: "destacado", headingSuffix: "?", linkLabel: "Ver mas", href: "/estudiantes" },
      ],
    }),
    aboutBebrasEditorial: () => ({
      type: "aboutBebrasEditorial",
      number: "03",
      kicker: "Iniciativa internacional",
      asideText: "Texto lateral.",
      heading: "Sobre Bebras",
      paragraphs: ["Parrafo de contenido."],
    }),
  };

  const factory = map[type];
  return factory ? factory() : null;
}

// ── Private: shared component templates ──────────────────

function _componentTemplate(type: string): unknown | null {
  const map: Record<string, () => unknown> = {
    faqAccordion: () => ({
      type: "faqAccordion",
      categories: [{ title: "Nueva seccion de preguntas frecuentes", items: [{ question: "Nueva pregunta", answer: "Nueva respuesta" }] }],
    }),
    sectionRichText: () => ({
      type: "sectionRichText", accent: "blue", tag: "Seccion", heading: "Titulo de seccion",
      paragraphs: ["Parrafo de ejemplo"], tip: "Tip opcional", linkLabel: "", linkHref: "",
    }),
    organizerInstitution: () => ({
      type: "organizerInstitution",
      accent: "blue",
      tag: "Institucion organizadora",
      name: "Nombre de la institucion",
      acronym: "SIGLA",
      location: "Bolivia",
      role: "Rol dentro de Bebras Bolivia",
      description: "Descripcion de la institucion y su aporte.",
      image: "/images/sponsor-placeholder.svg",
      linkLabel: "sitio-web.org",
      linkHref: "https://example.com",
    }),
    itemsGrid: () => ({
      type: "itemsGrid", tag: "Tarjetas", heading: "Titulo de tarjetas", intro: "Texto introductorio opcional",
      columns: 3, mediaType: "icon", cardPalette: ["red", "yellow", "green", "blue"],
      items: [
        { title: "Tarjeta 1", description: "Descripcion", icon: "monitor" },
        { title: "Tarjeta 2", description: "Descripcion", icon: "wifi" },
      ],
    }),
    itemsGridIcon: () => ({
      type: "itemsGrid", tag: "Tarjetas", heading: "Cuadricula con iconos", intro: "Seccion de tarjetas con iconos.",
      columns: 3, mediaType: "icon", cardPalette: ["red", "yellow", "green", "blue"],
      items: [
        { title: "Tarjeta 1", description: "Descripcion", icon: "monitor" },
        { title: "Tarjeta 2", description: "Descripcion", icon: "wifi" },
      ],
    }),
    itemsGridImage: () => ({
      type: "itemsGrid", tag: "Tarjetas", heading: "Cuadricula con imagenes", intro: "Seccion de tarjetas con imagen.",
      columns: 3, mediaType: "image", cardPalette: ["red", "yellow", "green", "blue"],
      items: [
        { title: "Tarjeta 1", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
        { title: "Tarjeta 2", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
      ],
    }),
    itemsGridNumber: () => ({
      type: "itemsGrid", tag: "Pasos", heading: "Cuadricula numerada", intro: "Seccion de pasos numerados.",
      columns: 3, mediaType: "number", cardPalette: ["red", "yellow", "green", "blue"],
      items: [
        { number: "1", title: "Paso 1", description: "Descripcion" },
        { number: "2", title: "Paso 2", description: "Descripcion" },
      ],
    }),
    itemsGridSimple: () => ({
      type: "itemsGrid", tag: "Tarjetas", heading: "Cuadricula simple", intro: "Seccion de tarjetas sin media.",
      columns: 3, mediaType: "none", cardPalette: ["red", "yellow", "green", "blue"],
      items: [
        { title: "Tarjeta 1", description: "Descripcion" },
        { title: "Tarjeta 2", description: "Descripcion" },
      ],
    }),
    linksList: () => ({
      type: "linksList", tag: "Enlaces", heading: "Recursos", cardPalette: ["blue", "red", "yellow", "green"],
      links: [{ label: "Bebras Internacional", href: "https://www.bebras.org/", description: "Sitio oficial" }],
    }),
    featureList: () => ({
      type: "featureList", tag: "Habilidades", heading: "Titulo de listado", intro: "Texto introductorio",
      cardPalette: ["blue", "red", "yellow", "green"],
      items: [{ title: "Punto 1", desc: "Descripcion" }], outro: "Texto de cierre",
    }),
    statsGrid: () => ({
      type: "statsGrid", tag: "Estadisticas", heading: "Titulo de estadisticas", columns: 3,
      cardPalette: ["green", "yellow", "red", "blue"],
      stats: [{ value: "15", label: "Preguntas" }, { value: "45", label: "Minutos" }],
      paragraphs: ["Descripcion del bloque."],
    }),
    studentsAgeCategories: () => ({
      type: "studentsAgeCategories", sectionTag: "Niveles", heading: "Categorias por Edad",
      cardPalette: ["red", "yellow", "green", "blue", "gray"],
      subtitle: "Cinco niveles disenados para desafiar a cada grupo de edad",
      categories: [
        { name: "Guacamayo", age: "5-8 anos", emoji: "🦜", color: "red", desc: "Primeros pasos en el pensamiento logico" },
        { name: "Capibara", age: "8-10 anos", emoji: "🦫", color: "yellow", desc: "Descubriendo patrones y secuencias" },
        { name: "Titi", age: "10-12 anos", emoji: "🐒", color: "green", desc: "Resolviendo problemas con creatividad" },
        { name: "Jucumari", age: "12-14 anos", emoji: "🐻", color: "blue", desc: "Algoritmos y pensamiento estructurado" },
        { name: "Yaguarete", age: "14-18 anos", emoji: "🐆", color: "gray", desc: "Desafios avanzados de informatica" },
      ],
    }),
    studentsScoringTable: () => ({
      type: "studentsScoringTable", sectionTag: "Puntuacion", heading: "Sistema de Puntuacion",
      subtitle: "Cada tarea pertenece a una categoria de dificultad. Inicias con 45 puntos.",
      cardPalette: ["red", "yellow", "green", "blue"],
      tableHeaders: ["Resultado", "Cat. A", "Cat. B", "Cat. C"],
      rows: [
        { label: "Correcta", values: ["+6", "+9", "+12"], status: "positive" },
        { label: "Sin respuesta", values: ["0", "0", "0"], status: "neutral" },
        { label: "Incorrecta", values: ["-2", "-3", "-4"], status: "negative" },
      ],
      summaryCards: [{ value: "45", label: "Puntaje inicial" }, { value: "180", label: "Puntaje maximo" }],
      summaryColumns: 2,
    }),
    tabsGuide: () => ({
      type: "tabsGuide", sectionTag: "Guia", heading: "Instrucciones", subtitle: "Pasos por etapa",
      cardPalette: ["blue", "red", "yellow"],
      tabs: [{
        id: "antes", label: "Antes", heading: "Antes del desafio",
        items: [{ title: "Paso", desc: "Descripcion" }],
      }],
    }),
    formContact: () => ({
      type: "formContact", tag: "Formulario", heading: "Envianos un mensaje",
      fields: {
        name: { label: "Nombre completo", placeholder: "Tu nombre" },
        email: { label: "Correo electronico", placeholder: "tu@email.com" },
        role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Maestro", "Institucion", "Otro"] },
        message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
      },
      submitLabel: "Enviar mensaje", disclaimer: "Este formulario es solo una vista previa.",
    }),
    cta: () => ({
      type: "cta", tag: "", heading: "No encontraste lo que buscabas?",
      text: "Contactanos y con gusto resolveremos tus dudas.",
      buttonLabel: "Ir a Contacto", buttonHref: "/contacto",
    }),
    blogIndex: () => ({
      type: "blogIndex",
      emptyState: { tag: "Sin contenido", text: "No hay publicaciones aun. Vuelve pronto!" },
      readMoreLabel: "Leer mas",
    }),
    blogPostUi: () => ({
      type: "blogPostUi", backLabel: "Volver al blog", ctaLabel: "Inscribirse al desafio",
    }),
    contactClassic: () => ({
      type: "contactClassic",
      info: {
        tag: "Informacion", heading: "Informacion de Contacto",
        cards: [{
          icon: "email", title: "Correo electronico", description: "Escribenos para cualquier consulta",
          linkLabel: "info@bebras.bo", linkHref: "mailto:info@bebras.bo",
        }],
      },
      international: {
        tag: "Comunidad Internacional",
        links: [{ label: "Bebras Internacional ->", href: "https://www.bebras.org/", description: "Sitio oficial Bebras" }],
      },
      form: {
        tag: "Formulario", heading: "Envianos un Mensaje",
        fields: {
          name: { label: "Nombre completo", placeholder: "Tu nombre" },
          email: { label: "Correo electronico", placeholder: "tu@email.com" },
          role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Maestro / Coordinador", "Institucion", "Otro"] },
          message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
        },
        submitLabel: "Enviar mensaje", disclaimer: "Este formulario es solo una vista previa.",
      },
    }),
  };

  const factory = map[type];
  return factory ? factory() : null;
}

