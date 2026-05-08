// ── Bebras CMS — Editor utilities ─────────────────────────
// Shared helpers used by the legacy-compatible editor orchestrator.

const CMSEditorLib = {
  fileToPage: {
    "site.json": "/",
    "navigation.json": "/",
    "hero.json": "/",
    "about.json": "/",
    "categories.json": "/",
    "scoring.json": "/",
    "news.json": "/",
    "faq.json": "/faq/",
    "teacher-instructions.json": "/maestros/",
    "sponsors.json": "/sponsors/",
    "contact.json": "/contacto/",
    "registro.json": "/registro/",
    "estudiantes.json": "/estudiantes/",
    "docentes.json": "/maestros/",
    "blog-ui.json": "/blog/",
  },

  fieldHints: {
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
  },

  selectOptions: {
    variant: ["button", "link"],
    status: ["positive", "neutral", "negative"],
    icon: ["monitor", "wifi", "user", "clock", "email", "clipboard", "share"],
    color: ["emerald", "amber", "sky", "violet", "rose", "orange", "indigo"],
  },

  hiddenFields: new Set(["id", "pageTitle", "pageDescription"]),

  parsePath(path) {
    const parts = [];
    const regex = /([^.[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
      parts.push(match[1] !== undefined ? match[1] : parseInt(match[2], 10));
    }
    return parts;
  },

  getNestedValue(obj, path) {
    let current = obj;
    for (const part of this.parsePath(path)) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  },

  setNestedValue(obj, path, value) {
    const parts = this.parsePath(path);
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        current[part] = typeof parts[i + 1] === "number" ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  },

  escapeForPre(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  toHexColor(str) {
    if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
    if (/^#[0-9a-fA-F]{3}$/.test(str)) {
      return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
    }
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = str;
      return ctx.fillStyle;
    } catch {
      return "#000000";
    }
  },

  formatLabel(key) {
    if (!key) return "";
    return key.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  shouldHideField(key) {
    return this.hiddenFields.has(key);
  },

  getFieldType(keyOrPath, value) {
    const key = String(keyOrPath).split(".").pop();
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (this.selectOptions[key]) return "select";
    if (this.fieldHints[key]) return this.fieldHints[key];
    if (typeof value === "string" && value.length > 100) return "textarea";
    return "text";
  },

  isImagePathField(path, value) {
    if (typeof value !== "string") return false;
    const key = String(path).split(".").pop() || "";
    if (["image", "src", "logo", "icon"].includes(key)) return true;
    return value.startsWith("/images/") || value.startsWith("/api/media/file/");
  },

  isAutoNumberField(path, currentData) {
    if (!/\.items\[\d+\]\.number$/.test(path)) return false;
    const parentPath = path.replace(/\.items\[\d+\]\.number$/, "");
    const parent = this.getNestedValue(currentData, parentPath);
    return !!(parent && parent.type === "itemsGrid" && parent.mediaType === "number");
  },

  isCollapsibleArray(path) {
    return path === "components" || path.endsWith(".components");
  },

  getArrayItemLabel(obj, idx) {
    if (obj && typeof obj === "object") {
      const labels = {
        faqQuestions: "FAQ",
        sponsorsCards: "Sponsors",
        blogIndex: "Blog Index",
        blogPostUi: "Blog Post UI",
        contactInfoCards: "Contacto Info",
        contactInternational: "Contacto Internacional",
        contactForm: "Contacto Formulario",
        contactClassic: "Contacto Clasico",
        docentesRegistro: "Maestros Registro",
        docentesRequisitos: "Maestros Requisitos",
        docentesAlcance: "Maestros Alcance",
        teacherInstructionsTabs: "Maestros Guia",
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
      if (labels[obj.type]) return `#${idx + 1} - ${labels[obj.type]}`;
      if (obj.title) return `#${idx + 1} - ${obj.title}`;
      if (obj.heading) return `#${idx + 1} - ${obj.heading}`;
      if (obj.label) return `#${idx + 1} - ${obj.label}`;
      if (obj.tag) return `#${idx + 1} - ${obj.tag}`;
      if (obj.type) return `#${idx + 1} - ${obj.type}`;
    }
    return `#${idx + 1}`;
  },

  getComponentOptions(path) {
    if (path !== "components") return [];
    return [
      { value: "sectionRichText", label: "Seccion de Texto", description: "Titulo, parrafos y tip opcional" },
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
  },

  blankClone(obj) {
    if (Array.isArray(obj)) return [];
    if (obj && typeof obj === "object") {
      const clone = {};
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) clone[key] = [];
        else if (value && typeof value === "object") clone[key] = this.blankClone(value);
        else clone[key] = "";
      }
      return clone;
    }
    return "";
  },

  getAddTypeOptions(path) {
    if (path.endsWith("tabs")) return [{ value: "tabStep", label: "Nueva pestana" }];
    if (path.endsWith("tabs[].items")) return [{ value: "tabItem", label: "Nuevo punto" }];
    if (path.endsWith(".items")) return [{ value: "gridItem", label: "Nuevo item" }];
    if (path.endsWith("skills")) return [{ value: "featureItem", label: "Nueva habilidad" }];
    if (path.endsWith("categories")) return [{ value: "ageCategoryItem", label: "Nueva categoria" }];
    if (path.endsWith("rows")) return [{ value: "scoringRow", label: "Nueva fila" }];
    if (path.endsWith("summary")) return [{ value: "scoringSummary", label: "Nuevo resumen" }];
    return [];
  },

  createTypedArrayItem(path, selectedType, currentFile, currentData) {
    if (selectedType === "sectionRichText") return { type: "sectionRichText", tag: "Seccion", heading: "Nuevo titulo", paragraphs: ["Nuevo parrafo"], tip: "" };
    if (selectedType === "itemsGridIcon") return { type: "itemsGrid", tag: "Cards", heading: "Nuevo grid", intro: "Intro", mediaType: "icon", items: [{ title: "Nuevo item", description: "Descripcion", icon: "monitor" }] };
    if (selectedType === "itemsGridImage") return { type: "itemsGrid", tag: "Cards", heading: "Nuevo grid", intro: "Intro", mediaType: "image", items: [{ title: "Nuevo item", description: "Descripcion", image: "/images/sponsor-placeholder.svg" }] };
    if (selectedType === "itemsGridNumber") return { type: "itemsGrid", tag: "Pasos", heading: "Nuevo grid", intro: "Intro", mediaType: "number", items: [{ number: "1", title: "Nuevo item", description: "Descripcion" }] };
    if (selectedType === "itemsGridSimple") return { type: "itemsGrid", tag: "Cards", heading: "Nuevo grid", intro: "Intro", mediaType: "none", items: [{ title: "Nuevo item", description: "Descripcion" }] };
    if (selectedType === "linksList") return { type: "linksList", tag: "Recursos", heading: "Lista de enlaces", links: [{ label: "Nuevo enlace", href: "/", description: "Descripcion" }] };
    if (selectedType === "featureList") return { type: "featureList", tag: "Caracteristicas", heading: "Lista de caracteristicas", intro: "Intro", features: [{ title: "Nueva caracteristica", desc: "Descripcion" }] };
    if (selectedType === "statsGrid") return { type: "statsGrid", tag: "Estadisticas", heading: "Estadisticas", stats: [{ value: "0", label: "Metrica" }], outro: "" };
    if (selectedType === "studentsAgeCategories") return { type: "studentsAgeCategories", tag: "Categorias", heading: "Categorias de edad", categories: [{ name: "Nueva categoria", age: "0-0 anos", emoji: "*", color: "violet", desc: "Descripcion" }] };
    if (selectedType === "studentsScoringTable") return { type: "studentsScoringTable", tag: "Puntaje", heading: "Tabla de puntaje", rows: [{ label: "Nueva fila", values: ["0", "0", "0"], status: "neutral" }], summary: [{ value: "0", label: "Resumen" }] };
    if (selectedType === "faqAccordion") return { type: "faqAccordion", tag: "FAQ", heading: "Preguntas frecuentes", items: [{ question: "Nueva pregunta", answer: "Respuesta" }] };
    if (selectedType === "tabsGuide") return { type: "tabsGuide", tag: "Guia", heading: "Guia", tabs: [{ id: `tab-${Date.now()}`, label: "Nueva pestana", heading: "Titulo", items: [{ title: "Nuevo punto", desc: "Descripcion" }] }] };
    if (selectedType === "formContact") return { type: "formContact", tag: "Formulario", heading: "Formulario", fields: { name: { label: "Nombre", placeholder: "Tu nombre" }, email: { label: "Email", placeholder: "tu@email.com" }, message: { label: "Mensaje", placeholder: "Mensaje" } }, submitLabel: "Enviar" };
    if (selectedType === "blogIndex") return { type: "blogIndex", emptyTitle: "Sin publicaciones", emptyDescription: "Pronto tendremos novedades.", readMoreLabel: "Leer mas" };
    if (selectedType === "blogPostUi") return { type: "blogPostUi", backLabel: "Volver al blog", ctaTitle: "Sigue explorando", ctaButton: "Ver publicaciones" };
    if (selectedType === "contactClassic") return { type: "contactClassic", tag: "Contacto", heading: "Contacto", intro: "Escribenos", email: "info@bebras.bo" };
    if (selectedType === "cta") return { type: "cta", heading: "Llamado a la accion", text: "Texto", button: { label: "Continuar", href: "/" } };
    if (selectedType === "tabStep") return { id: `tab-${Date.now()}`, label: "Nueva pestana", heading: "Titulo de pestana", items: [{ title: "Nuevo punto", desc: "Descripcion" }] };
    if (selectedType === "tabItem") return { title: "Nuevo punto", desc: "Descripcion" };
    if (selectedType === "gridItem") {
      const parent = this.getNestedValue(currentData, String(path).replace(/\.items$/, ""));
      if (parent?.type === "itemsGrid") {
        if (parent.mediaType === "icon") return { title: "Nuevo item", description: "Descripcion", icon: "monitor" };
        if (parent.mediaType === "image") return { title: "Nuevo item", description: "Descripcion", image: "/images/sponsor-placeholder.svg" };
        if (parent.mediaType === "number") return { number: "", title: "Nuevo item", description: "Descripcion" };
      }
      return { title: "Nuevo item", description: "Descripcion" };
    }
    if (selectedType === "featureItem") return { title: "Nueva habilidad", desc: "Descripcion" };
    if (selectedType === "ageCategoryItem") return { name: "Nueva categoria", age: "0-0 anos", emoji: "*", color: "violet", desc: "Descripcion" };
    if (selectedType === "scoringRow") return { label: "Nueva fila", values: ["0", "0", "0"], status: "neutral" };
    if (selectedType === "scoringSummary") return { value: "0", label: "Resumen" };
    return null;
  },

  createEmptyArrayItem(path, currentFile, currentData) {
    const normalizedPath = String(path).replace(/\[\d+\]/g, "[]");
    if (currentFile === "faq.json" && normalizedPath.endsWith("categories[].items")) return { question: "", answer: "" };
    if (normalizedPath.endsWith("tabs[].items")) return { title: "", desc: "" };
    if (normalizedPath.endsWith(".items")) {
      const parent = this.getNestedValue(currentData, String(path).replace(/\.items$/, ""));
      if (parent?.type === "itemsGrid") {
        if (parent.mediaType === "icon") return { title: "", description: "", icon: "monitor" };
        if (parent.mediaType === "image") return { title: "", description: "", image: "/images/sponsor-placeholder.svg" };
        if (parent.mediaType === "number") return { number: "", title: "", description: "" };
        return { title: "", description: "" };
      }
    }
    return "";
  },

  generateUniqueSlug(currentData, base) {
    const pages = Array.isArray(currentData?.pages) ? currentData.pages : [];
    const used = new Set(pages.map((p) => p.slug));
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  },

  attachDragEvents(item, container, arrayPath, callbacks) {
    this.bindContainerDnd(container, arrayPath, callbacks);
    const handle = item.querySelector(".drag-handle");
    if (!handle) return;
    handle.addEventListener("mousedown", () => item.setAttribute("draggable", "true"));
    handle.addEventListener("mouseup", () => item.setAttribute("draggable", "false"));
  },

  bindContainerDnd(container, arrayPath, callbacks) {
    if (container.__cmsDndBound) return;
    container.__cmsDndBound = true;
    let dragState = null;

    container.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".array-item");
      if (!item) return;
      dragState = { arrayPath, fromIdx: parseInt(item.getAttribute("data-dnd-idx"), 10) };
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });

    container.addEventListener("dragend", (e) => {
      const item = e.target.closest(".array-item");
      if (item) {
        item.classList.remove("dragging");
        item.setAttribute("draggable", "false");
      }
      container.querySelectorAll(".array-item").forEach((el) => el.classList.remove("drag-over-above", "drag-over-below"));
      dragState = null;
    });

    container.addEventListener("dragover", (e) => {
      if (!dragState || dragState.arrayPath !== arrayPath) return;
      const item = e.target.closest(".array-item");
      if (!item) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = item.getBoundingClientRect();
      const isAbove = e.clientY < rect.top + rect.height / 2;
      container.querySelectorAll(".array-item").forEach((el) => el.classList.remove("drag-over-above", "drag-over-below"));
      item.classList.add(isAbove ? "drag-over-above" : "drag-over-below");
    });

    container.addEventListener("drop", (e) => {
      if (!dragState || dragState.arrayPath !== arrayPath) return;
      const item = e.target.closest(".array-item");
      if (!item) return;
      e.preventDefault();
      const fromIdx = dragState.fromIdx;
      const toIdx = parseInt(item.getAttribute("data-dnd-idx"), 10);
      const rect = item.getBoundingClientRect();
      let targetIdx = e.clientY < rect.top + rect.height / 2 ? toIdx : toIdx + 1;
      if (fromIdx < targetIdx) targetIdx--;
      if (fromIdx !== targetIdx) this.moveArrayItem(arrayPath, fromIdx, targetIdx, callbacks);
      container.querySelectorAll(".array-item").forEach((el) => el.classList.remove("drag-over-above", "drag-over-below"));
      dragState = null;
    });
  },

  moveArrayItem(path, fromIdx, toIdx, callbacks) {
    if (!callbacks.isReactEditorActive()) callbacks.collectFormData();
    const data = callbacks.getCurrentData();
    const arr = this.getNestedValue(data, path);
    if (!Array.isArray(arr) || fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= arr.length) return;
    if (toIdx < 0 || toIdx >= arr.length) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    this.setNestedValue(data, path, arr);
    callbacks.normalizeStructuredArrays();
    callbacks.setDirty();
    callbacks.rerenderEditorForm();
  },
};

window.CMSEditorLib = CMSEditorLib;
