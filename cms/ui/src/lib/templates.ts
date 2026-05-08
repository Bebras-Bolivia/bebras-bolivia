// ── Templates & config — extracted from editor.js ──
// Contains all static configuration, component option maps, typed item
// factories, and field-type resolution logic.

import { getNestedValue, generateUniqueSlug } from "./path-helpers";

// ── Route mapping ────────────────────────────────────────
export const fileToPage: Record<string, string> = {
  "home.json": "/",
  "site.json": "/",
  "navigation.json": "/",
  "hero.json": "/",
  "about.json": "/",
  "categories.json": "/",
  "scoring.json": "/",
  "news.json": "/",
  "faq.json": "/faq/",
  "teacher-instructions.json": "/docentes/",
  "sponsors.json": "/sponsors/",
  "contact.json": "/contacto/",
  "registro.json": "/registro/",
  "estudiantes.json": "/estudiantes/",
  "docentes.json": "/docentes/",
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
  color: "color",
};

// ── Select field options ─────────────────────────────────
export const selectOptions: Record<string, string[]> = {
  variant: ["button", "link"],
  style: ["primary", "secondary"],
  status: ["positive", "neutral", "negative"],
  icon: ["monitor", "wifi", "user", "clock", "email", "clipboard", "share", "school", "brain"],
  color: ["emerald", "amber", "sky", "violet", "rose", "indigo"],
  imageKey: ["guacamayo", "capibara", "titi", "jucumari", "yaguarete"],
};

// ── Hidden fields ────────────────────────────────────────
export const hiddenFields = new Set(["id"]);

// ── Component option type ────────────────────────────────
export type ComponentOption = {
  value: string;
  label: string;
  description: string;
};

// ── Component options for "add component" modal ──────────
const componentOptionsList: ComponentOption[] = [
  { value: "sectionRichText", label: "Seccion de Texto", description: "Titulo, parrafos y tip opcional" },
  { value: "organizerInstitution", label: "Institucion organizadora", description: "Bloque destacado de institucion o sponsor" },
  { value: "itemsGridIcon", label: "Grid cards + icono", description: "Cards con icono visual" },
  { value: "itemsGridImage", label: "Grid cards + imagen", description: "Cards con imagen" },
  { value: "itemsGridNumber", label: "Grid cards + numero", description: "Cards tipo pasos numerados" },
  { value: "itemsGridSimple", label: "Grid cards simple", description: "Cards sin icono ni imagen" },
  { value: "linksList", label: "Lista de Enlaces", description: "Listado de recursos o enlaces externos" },
  { value: "featureList", label: "Lista de Caracteristicas", description: "Lista con checks y texto introductorio" },
  { value: "statsGrid", label: "Grid de Estadisticas", description: "Metricas en tarjetas con texto inferior" },
  { value: "studentsAgeCategories", label: "Categorias de Edad", description: "Categorias completas y editables" },
  { value: "studentsScoringTable", label: "Tabla de Puntaje", description: "Tabla completa y editable" },
  { value: "faqAccordion", label: "FAQ Acordeon", description: "Preguntas y respuestas en acordeon" },
  { value: "tabsGuide", label: "Guia en Tabs", description: "Contenido por pestanas" },
  { value: "formContact", label: "Formulario", description: "Formulario de contacto editable" },
  { value: "blogIndex", label: "Blog Index", description: "Estado vacio y texto Leer mas" },
  { value: "blogPostUi", label: "Blog Post UI", description: "Textos de volver y CTA del post" },
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

export function getFieldType(keyOrPath: string, value: unknown): string {
  const key = String(keyOrPath).split(".").pop() || "";
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
  const parent: any = getNestedValue(currentData, parentPath);
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
    || path.endsWith(".tabs")
    || path.endsWith(".paragraphs");
}

// ── Array item labels ────────────────────────────────────

const typeLabelMap: Record<string, string> = {
  faqQuestions: "FAQ",
  sponsorsCards: "Sponsors",
  blogIndex: "Blog Index",
  blogPostUi: "Blog Post UI",
  contactInfoCards: "Contacto Info",
  contactInternational: "Contacto Internacional",
  contactForm: "Contacto Formulario",
  contactClassic: "Contacto Clasico",
  organizerInstitution: "Institucion Organizadora",
  introEditorial: "Inicio: Texto editorial",
  homeAgeCategories: "Inicio: Categorias",
  homeDualCta: "Inicio: CTA doble",
  aboutBebrasEditorial: "Inicio: Sobre Bebras",
  docentesRegistro: "Docentes Registro",
  docentesRequisitos: "Docentes Requisitos",
  docentesAlcance: "Docentes Alcance",
  teacherInstructionsTabs: "Docentes Guia",
  sectionRichText: "Texto",
  itemsGrid: "Grid de Cards",
  linksList: "Lista de Enlaces",
  featureList: "Lista de Caracteristicas",
  statsGrid: "Grid de Estadisticas",
  studentsAgeCategories: "Categorias de Edad",
  studentsScoringTable: "Tabla de Puntaje",
  faqAccordion: "FAQ Acordeon",
  tabsGuide: "Guia en Tabs",
  formContact: "Formulario",
  cta: "CTA",
};

export function getArrayItemLabel(obj: any, idx: number): string {
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

export type AddTypeOption = { value: string; label: string };

export function getAddTypeOptions(
  path: string,
  currentFile: string,
  currentData: unknown,
): AddTypeOption[] | null {
  if (currentFile === "custom-pages.json" && path === "pages") {
    return [{ value: "customPage", label: "Pagina personalizada" }];
  }

  if (currentFile === "custom-pages.json" && path.endsWith(".blocks")) {
    return [
      { value: "text", label: "Bloque de texto" },
      { value: "cardsGrid", label: "Grid de cards" },
      { value: "tip", label: "Tip / cita" },
      { value: "cta", label: "CTA (boton o enlace)" },
    ];
  }

  if (currentFile === "home.json" && path === "sections") {
    return [
      { value: "introEditorial", label: "Inicio: Texto editorial" },
      { value: "homeAgeCategories", label: "Inicio: Categorias" },
      { value: "homeDualCta", label: "Inicio: CTA doble" },
      { value: "aboutBebrasEditorial", label: "Inicio: Sobre Bebras" },
    ];
  }

  if (currentFile === "estudiantes.json" && path === "sections") {
    return [
      { value: "participacion", label: "Estudiantes: Participacion" },
      { value: "desafio", label: "Estudiantes: Desafio" },
      { value: "habilidades", label: "Estudiantes: Habilidades" },
      { value: "formato", label: "Estudiantes: Formato" },
      { value: "certificados", label: "Estudiantes: Certificados" },
    ];
  }

  if (/\.tabs$/.test(path)) {
    const parentPath = path.replace(/\.tabs$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
    if (parent && (parent.type === "tabsGuide" || parent.type === "teacherInstructionsTabs")) {
      return [{ value: "tabStep", label: "Pestana" }];
    }
  }

  if (/\.tabs\[\d+\]\.items$/.test(path)) {
    return [{ value: "tabItem", label: "Elemento de pestana" }];
  }

  if (/\.items$/.test(path)) {
    const parentPath = path.replace(/\.items$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "itemsGrid") {
      return [{ value: "gridItem", label: "Item de card" }];
    }
    if (parent && parent.type === "featureList") {
      return [{ value: "featureItem", label: "Item de lista" }];
    }
  }

  if (/\.categories$/.test(path)) {
    const parentPath = path.replace(/\.categories$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "studentsAgeCategories") {
      return [{ value: "ageCategoryItem", label: "Categoria" }];
    }
  }

  if (/\.rows$/.test(path)) {
    const parentPath = path.replace(/\.rows$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "studentsScoringTable") {
      return [{ value: "scoringRow", label: "Fila de tabla" }];
    }
  }

  if (/\.summaryCards$/.test(path)) {
    const parentPath = path.replace(/\.summaryCards$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
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

  if (currentFile === "faq.json" && normalizedPath.endsWith("categories[].items")) {
    return { question: "", answer: "" };
  }

  if (normalizedPath.endsWith("tabs[].items")) {
    return { title: "", desc: "" };
  }

  if (normalizedPath.endsWith(".items")) {
    const parentPath = String(path).replace(/\.items$/, "");
    const parent: any = getNestedValue(currentData, parentPath);
    if (parent && parent.type === "itemsGrid") {
      if (parent.mediaType === "icon") return { title: "", description: "", icon: "monitor" };
      if (parent.mediaType === "image") return { title: "", description: "", image: "/images/sponsor-placeholder.svg" };
      if (parent.mediaType === "number") return { number: "", title: "", description: "" };
      return { title: "", description: "" };
    }
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
  // ── Custom pages ──
  if (currentFile === "custom-pages.json" && path === "pages") {
    const slugBase = generateUniqueSlug(currentData, "nueva-pagina");
    return {
      id: slugBase,
      title: "Nueva pagina",
      slug: slugBase,
      description: "Describe aqui la nueva pagina.",
      navLabel: "Nueva pagina",
      showInHeader: false,
      blocks: [
        {
          type: "text",
          sectionTag: "Seccion",
          heading: "Titulo",
          paragraphs: ["Contenido inicial."],
        },
      ],
    };
  }

  if (currentFile === "custom-pages.json" && path.endsWith(".blocks")) {
    return _customPageBlock(selectedType);
  }

  if (currentFile === "home.json" && path === "sections") {
    return _homeSection(selectedType);
  }

  // ── Shared page components ──
  if (path === "components") {
    return _componentTemplate(selectedType);
  }

  // ── Estudiantes sections ──
  if (currentFile === "estudiantes.json" && path === "sections") {
    return _estudiantesSection(selectedType);
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
    const parent: any = getNestedValue(currentData, parentPath);
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
    return { name: "Nueva categoria", age: "0-0 anos", emoji: "🧩", color: "violet", desc: "Descripcion" };
  }

  if (selectedType === "scoringRow") {
    return { label: "Nueva fila", values: ["0", "0", "0"], status: "neutral" };
  }

  if (selectedType === "scoringSummary") {
    return { value: "0", label: "Resumen" };
  }

  return null;
}

// ── Private: custom-pages block templates ────────────────

function _customPageBlock(type: string): unknown | null {
  if (type === "text") {
    return { type: "text", sectionTag: "Seccion", heading: "Titulo", paragraphs: ["Escribe aqui el contenido."] };
  }
  if (type === "cardsGrid") {
    return {
      type: "cardsGrid", sectionTag: "Grid", heading: "Titulo de cards", columns: 3,
      cards: [
        { title: "Card 1", description: "Descripcion de la card." },
        { title: "Card 2", description: "Descripcion de la card." },
        { title: "Card 3", description: "Descripcion de la card." },
      ],
    };
  }
  if (type === "tip") {
    return { type: "tip", sectionTag: "Tip", heading: "Nota", text: "Texto destacado tipo cita o recomendacion." };
  }
  if (type === "cta") {
    return {
      type: "cta", sectionTag: "CTA", heading: "Llamado a la accion",
      text: "Descripcion opcional del llamado a la accion.",
      variant: "button",
      action: { label: "Ver mas", href: "/" },
    };
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
      headingPrefix: "Titulo",
      headingEmphasis: "destacado",
      paragraphs: ["Parrafo principal.", "Parrafo secundario."],
    }),
    homeAgeCategories: () => ({
      type: "homeAgeCategories",
      number: "02",
      kicker: "Categorias",
      asideText: "Descripcion lateral.",
      headingPrefix: "Categorias por",
      headingEmphasis: "edad",
      linkLabel: "Ver mas",
      linkHref: "/estudiantes",
      items: [
        { name: "Guacamayo", range: "5 a 8 anos", color: "rose", imageKey: "guacamayo", author: "Autor", authorUrl: "https://example.com" },
      ],
    }),
    homeDualCta: () => ({
      type: "homeDualCta",
      cards: [
        { audience: "Docentes", style: "primary", icon: "school", headingPrefix: "Titulo", headingEmphasis: "destacado", headingSuffix: "final", linkLabel: "Ver mas", href: "/registro" },
        { audience: "Estudiantes", style: "secondary", icon: "brain", headingPrefix: "Titulo", headingEmphasis: "destacado", headingSuffix: "?", linkLabel: "Ver mas", href: "/estudiantes" },
      ],
    }),
    aboutBebrasEditorial: () => ({
      type: "aboutBebrasEditorial",
      number: "03",
      kicker: "Iniciativa internacional",
      asideText: "Texto lateral.",
      headingPrefix: "Sobre",
      headingEmphasis: "Bebras",
      paragraphs: ["Parrafo de contenido."],
    }),
  };

  const factory = map[type];
  return factory ? factory() : null;
}

// ── Private: shared component templates ──────────────────

function _componentTemplate(type: string): unknown | null {
  const map: Record<string, () => unknown> = {
    faqQuestions: () => ({
      type: "faqQuestions",
      categories: [{ title: "Nueva seccion FAQ", items: [{ question: "Nueva pregunta", answer: "Nueva respuesta" }] }],
    }),
    faqAccordion: () => ({
      type: "faqAccordion",
      categories: [{ title: "Nueva seccion FAQ", items: [{ question: "Nueva pregunta", answer: "Nueva respuesta" }] }],
    }),
    sectionRichText: () => ({
      type: "sectionRichText", tag: "Seccion", heading: "Titulo de seccion",
      paragraphs: ["Parrafo de ejemplo"], tip: "Tip opcional", linkLabel: "", linkHref: "",
    }),
    organizerInstitution: () => ({
      type: "organizerInstitution",
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
      type: "itemsGrid", tag: "Cards", heading: "Titulo de cards", intro: "Texto introductorio opcional",
      columns: 3, mediaType: "icon",
      items: [
        { title: "Card 1", description: "Descripcion", icon: "monitor" },
        { title: "Card 2", description: "Descripcion", icon: "wifi" },
      ],
    }),
    itemsGridIcon: () => ({
      type: "itemsGrid", tag: "Cards", heading: "Grid con iconos", intro: "Seccion de cards con iconos.",
      columns: 3, mediaType: "icon",
      items: [
        { title: "Card 1", description: "Descripcion", icon: "monitor" },
        { title: "Card 2", description: "Descripcion", icon: "wifi" },
      ],
    }),
    itemsGridImage: () => ({
      type: "itemsGrid", tag: "Cards", heading: "Grid con imagenes", intro: "Seccion de cards con imagen.",
      columns: 3, mediaType: "image",
      items: [
        { title: "Card 1", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
        { title: "Card 2", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
      ],
    }),
    itemsGridNumber: () => ({
      type: "itemsGrid", tag: "Pasos", heading: "Grid numerado", intro: "Seccion de pasos numerados.",
      columns: 3, mediaType: "number",
      items: [
        { number: "1", title: "Paso 1", description: "Descripcion" },
        { number: "2", title: "Paso 2", description: "Descripcion" },
      ],
    }),
    itemsGridSimple: () => ({
      type: "itemsGrid", tag: "Cards", heading: "Grid simple", intro: "Seccion de cards sin media.",
      columns: 3, mediaType: "none",
      items: [
        { title: "Card 1", description: "Descripcion" },
        { title: "Card 2", description: "Descripcion" },
      ],
    }),
    linksList: () => ({
      type: "linksList", tag: "Enlaces", heading: "Recursos",
      links: [{ label: "Bebras Internacional", href: "https://www.bebras.org/", description: "Sitio oficial" }],
    }),
    featureList: () => ({
      type: "featureList", tag: "Habilidades", heading: "Titulo de listado", intro: "Texto introductorio",
      items: [{ title: "Punto 1", desc: "Descripcion" }], outro: "Texto de cierre",
    }),
    statsGrid: () => ({
      type: "statsGrid", tag: "Estadisticas", heading: "Titulo de estadisticas", columns: 3,
      stats: [{ value: "15", label: "Preguntas" }, { value: "45", label: "Minutos" }],
      paragraphs: ["Descripcion del bloque."],
    }),
    studentsAgeCategories: () => ({
      type: "studentsAgeCategories", sectionTag: "Niveles", heading: "Categorias por Edad",
      subtitle: "Cinco niveles disenados para desafiar a cada grupo de edad",
      categories: [
        { name: "Guacamayo", age: "5-8 anos", emoji: "🦜", color: "rose", desc: "Primeros pasos en el pensamiento logico" },
        { name: "Capibara", age: "8-10 anos", emoji: "🦫", color: "amber", desc: "Descubriendo patrones y secuencias" },
        { name: "Titi", age: "10-12 anos", emoji: "🐒", color: "emerald", desc: "Resolviendo problemas con creatividad" },
        { name: "Jucumari", age: "12-14 anos", emoji: "🐻", color: "sky", desc: "Algoritmos y pensamiento estructurado" },
        { name: "Yaguarete", age: "14-18 anos", emoji: "🐆", color: "indigo", desc: "Desafios avanzados de informatica" },
      ],
    }),
    studentsScoringTable: () => ({
      type: "studentsScoringTable", sectionTag: "Puntuacion", heading: "Sistema de Puntuacion",
      subtitle: "Cada tarea pertenece a una categoria de dificultad. Inicias con 45 puntos.",
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
      tabs: [{
        id: "antes", label: "Antes", heading: "Antes del desafio",
        items: [{ title: "Paso", desc: "Descripcion" }],
      }],
    }),
    formContact: () => ({
      type: "formContact", tag: "Formulario", heading: "Envianos un mensaje",
      fields: {
        name: { label: "Nombre completo", placeholder: "Tu nombre" },
        email: { label: "Email", placeholder: "tu@email.com" },
        role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Docente", "Institucion", "Otro"] },
        message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
      },
      submitLabel: "Enviar mensaje", disclaimer: "Este formulario es solo una vista previa.",
    }),
    sponsorsCards: () => ({
      type: "sponsorsCards", tag: "Nueva seccion de sponsors", columns: 3,
      cards: [{ name: "Nuevo sponsor", desc: "Descripcion del sponsor.", image: "/images/sponsor-placeholder.svg" }],
    }),
    docentesRegistro: () => ({
      type: "docentesRegistro", tag: "Registro", heading: "Como inscriben a sus estudiantes?",
      intro: "El proceso de inscripcion es simple y gratuito.", columns: 3,
      steps: [
        { num: "1", title: "Registro del coordinador", desc: "Crear cuenta en la plataforma Bebras Bolivia." },
        { num: "2", title: "Inscripcion de estudiantes", desc: "Agregar estudiantes por categoria de edad." },
        { num: "3", title: "Dia del desafio", desc: "Supervisar la sesion en la escuela." },
      ],
    }),
    docentesRequisitos: () => ({
      type: "docentesRequisitos", tag: "Requisitos", heading: "Que necesita la escuela?", columns: 2,
      requirements: [
        { icon: "monitor", title: "Computadoras con navegador web", desc: "Chrome, Firefox, Edge o Safari actualizados." },
        { icon: "wifi", title: "Conexion a internet", desc: "Estable durante los 45 minutos del desafio." },
      ],
    }),
    docentesAlcance: () => ({
      type: "docentesAlcance", tag: "Alcance", heading: "Quien deberia participar?",
      content: ["Contenido de alcance para docentes."],
      tip: "Tip: El desafio no requiere conocimientos previos de programacion.",
    }),
    teacherInstructionsTabs: () => ({
      type: "teacherInstructionsTabs", sectionTag: "Guia para coordinadores",
      heading: "Instrucciones para Coordinadores",
      subtitle: "Guia paso a paso para antes, durante y despues del desafio.",
      tabs: [{
        id: "antes", label: "Antes", heading: "Antes del Desafio",
        items: [{ title: "Registrarse como coordinador", desc: "Completar los datos de la escuela." }],
      }],
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
    contactInfoCards: () => ({
      type: "contactInfoCards", tag: "Informacion", heading: "Informacion de Contacto",
      cards: [{
        icon: "email", title: "Email", description: "Escribenos para cualquier consulta",
        linkLabel: "info@bebras.bo", linkHref: "mailto:info@bebras.bo",
      }],
    }),
    contactInternational: () => ({
      type: "contactInternational", tag: "Comunidad Internacional",
      links: [{ label: "Bebras Internacional ->", href: "https://www.bebras.org/", description: "Sitio oficial Bebras" }],
    }),
    contactForm: () => ({
      type: "contactForm", tag: "Formulario", heading: "Envianos un Mensaje",
      fields: {
        name: { label: "Nombre completo", placeholder: "Tu nombre" },
        email: { label: "Email", placeholder: "tu@email.com" },
        role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Docente / Coordinador", "Institucion", "Otro"] },
        message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
      },
      submitLabel: "Enviar mensaje", disclaimer: "Este formulario es solo una vista previa.",
    }),
    contactClassic: () => ({
      type: "contactClassic",
      info: {
        tag: "Informacion", heading: "Informacion de Contacto",
        cards: [{
          icon: "email", title: "Email", description: "Escribenos para cualquier consulta",
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
          email: { label: "Email", placeholder: "tu@email.com" },
          role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Docente / Coordinador", "Institucion", "Otro"] },
          message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
        },
        submitLabel: "Enviar mensaje", disclaimer: "Este formulario es solo una vista previa.",
      },
    }),
  };

  const factory = map[type];
  return factory ? factory() : null;
}

// ── Private: estudiantes section templates ────────────────

function _estudiantesSection(type: string): unknown | null {
  const map: Record<string, () => unknown> = {
    participacion: () => ({
      id: "participacion", tag: "Participacion", heading: "Como participar",
      content: ["Parrafo"], link: { label: "Ver docentes", href: "/docentes" },
    }),
    desafio: () => ({
      id: "desafio", tag: "Desafio", heading: "Que es el desafio", content: ["Parrafo"],
    }),
    habilidades: () => ({
      id: "habilidades", tag: "Habilidades", heading: "Habilidades clave",
      intro: "Intro", skills: [{ title: "Habilidad", desc: "Descripcion" }], outro: "Cierre",
    }),
    formato: () => ({
      id: "formato", tag: "Formato", heading: "Formato del desafio",
      stats: [{ value: "15", label: "Preguntas" }, { value: "45", label: "Minutos" }],
      content: ["Parrafo"],
    }),
    certificados: () => ({
      id: "certificados", tag: "Certificados", heading: "Certificados",
      content: ["Parrafo"], cta: { label: "Inscribirse", href: "/registro" },
    }),
  };

  const factory = map[type];
  return factory ? factory() : null;
}
