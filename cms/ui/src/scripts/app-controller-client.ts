/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    CMS_BASE_PATH?: string;
    API: any;
    Toast: any;
    CMSDashboard?: any;
    CMSSidebar?: any;
    Editor: any;
    Blog: any;
    Snapshots: any;
    App?: any;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const contentMeta: Record<string, { label: string; desc: string; icon: string }> = {
  "home.json": { label: "Inicio", desc: "Pagina de inicio completa", icon: "dashboard" },
  "categories.json": { label: "Categorias", desc: "Grupos de edad y descripcion", icon: "layers" },
  "scoring.json": { label: "Puntaje", desc: "Tabla de puntajes, resumen", icon: "bar-chart" },
  "faq.json": { label: "Preguntas frecuentes", desc: "Preguntas frecuentes por categoria", icon: "help-circle" },
  "teacher-instructions.json": { label: "Maestros (guia)", desc: "Instrucciones en tabs", icon: "book-open" },
  "sponsors.json": { label: "Patrocinadores", desc: "Patrocinadores y ancla de navegacion", icon: "heart" },
  "contact.json": { label: "Contacto", desc: "Info de contacto, formulario", icon: "mail" },
  "registro.json": { label: "Registro", desc: "Pagina de registro (inscripcion)", icon: "user-plus" },
  "estudiantes.json": { label: "Estudiantes", desc: "Pagina de estudiantes (secciones)", icon: "graduation-cap" },
  "docentes.json": { label: "Maestros", desc: "Pagina de maestros (secciones)", icon: "briefcase" },
  "blog-ui.json": { label: "Interfaz del blog", desc: "Textos de la interfaz del blog", icon: "file-text" },
  "page-composition.json": { label: "Composicion de paginas", desc: "Orden y posicion de subsecciones hijas", icon: "move" },
};

const hiddenContentFiles = new Set([
  "categories.json",
  "scoring.json",
  "teacher-instructions.json",
  "page-composition.json",
]);

const contentHierarchy = [
  { label: "Inicio", parent: "home.json", children: [] },
  { label: "Estudiantes", parent: "estudiantes.json", children: [] },
  { label: "Maestros", parent: "docentes.json", children: [] },
  { label: "Preguntas frecuentes", parent: "faq.json", children: [] },
  { label: "Blog", parent: "blog-ui.json", children: [] },
  { label: "Patrocinadores", parent: "sponsors.json", children: [] },
  { label: "Contacto", parent: "contact.json", children: [] },
  { label: "Registro", parent: "registro.json", children: [] },
];

function contentFileFromRoute(value: string) {
  return value === "maestros.json" ? "docentes.json" : value;
}

const icons: Record<string, string> = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  publish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
};

const App = {
  currentPage: null as string | null,
  user: null as { name: string; email: string } | null,
  basePath: (window.CMS_BASE_PATH || "").replace(/\/$/, ""),
  contentMeta,
  contentHierarchy,
  icons,
  icon(name: string) { return icons[name] || ""; },

  appUrl(path: string) {
    if (!path.startsWith("/")) return path;
    return `${this.basePath}${path}`;
  },

  appPathname() {
    const pathname = window.location.pathname;
    if (this.basePath && pathname.startsWith(this.basePath)) {
      return pathname.slice(this.basePath.length) || "/";
    }
    return pathname;
  },

  async init() {
    this.user = await window.API.checkAuth();
    if (!this.user) {
      window.location.href = this.appUrl("/login.html");
      return;
    }

    localStorage.setItem("cms_user", JSON.stringify(this.user));
    this.renderSidebarUser();
    this.setupNav();
    await this.renderSidebarContentTree();
    this.setupMobileSidebar();
    this.route();
    window.addEventListener("popstate", () => this.route());
  },

  renderSidebarUser() {
    const userEl = document.getElementById("sidebar-user");
    if (!userEl || !this.user) return;
    const initials = (this.user.name || "A").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    userEl.innerHTML = `<div class="avatar">${initials}</div><div class="info"><div class="name">${this.escapeHtml(this.user.name)}</div><div class="email">${this.escapeHtml(this.user.email)}</div></div>`;
  },

  setupNav() {
    document.querySelector(".sidebar-nav")?.addEventListener("click", (e: Event) => {
      const target = (e.target as HTMLElement | null)?.closest("[data-nav]");
      if (!target) return;
      e.preventDefault();
      this.navigate(target.getAttribute("data-nav"));
      this.closeMobileSidebar();
    });
    document.getElementById("logout-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      window.API.logout();
    });
    document.getElementById("header-publish-btn")?.addEventListener("click", () => this.handlePublish());
  },

  setupMobileSidebar() {
    document.getElementById("mobile-menu-btn")?.addEventListener("click", () => this.toggleMobileSidebar());
    document.getElementById("sidebar-overlay")?.addEventListener("click", () => this.closeMobileSidebar());
    document.addEventListener("keydown", (e) => {
      const sidebar = document.querySelector(".sidebar");
      if (e.key === "Escape" && sidebar?.classList.contains("open")) this.closeMobileSidebar();
    });
  },

  toggleMobileSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar) return;
    if (sidebar.classList.contains("open")) this.closeMobileSidebar();
    else {
      sidebar.classList.add("open");
      overlay?.classList.add("active");
    }
  },

  closeMobileSidebar() {
    document.querySelector(".sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.remove("active");
  },

  navigate(path: string) {
    if (this.appPathname() === path) return;
    history.pushState(null, "", this.appUrl(path));
    this.route();
  },

  async renderSidebarContentTree() {
    const container = document.getElementById("sidebar-content-tree");
    if (!container) return;
    try {
      const contentData = await window.API.listContent();
      const tree = this.getContentTree(contentData.files || []);
      const nodes = tree.map((node: { parent: string; children: string[] }) => {
        const parentMeta = contentMeta[node.parent] || { label: node.parent, icon: "edit" };
        return {
          parent: node.parent,
          children: node.children,
          parentLabel: parentMeta.label || node.parent,
          parentIcon: parentMeta.icon || "edit",
          childrenMeta: node.children.map((child: string) => ({ key: child, label: contentMeta[child]?.label || child })),
        };
      });
      container.innerHTML = '<div id="react-sidebar-tree-root"></div>';
      const root = document.getElementById("react-sidebar-tree-root");
      window.CMSSidebar?.mountTree(root, { nodes, icons, onNavigate: (path: string) => this.navigate(path) });
    } catch (err) {
      container.innerHTML = `<div class="sidebar-tree-loading">No se pudo cargar el contenido</div>`;
      console.error("Failed to render sidebar content tree", err);
    }
  },

  // The first content page (e.g. Inicio) is the CMS landing screen — a
  // non-technical editor arrives straight at editable content, not a dashboard.
  firstContentFile() {
    return this.contentHierarchy[0]?.parent || "home.json";
  },

  route() {
    const path = this.appPathname();
    document.querySelectorAll("[data-nav]").forEach((el) => el.classList.toggle("active", el.getAttribute("data-nav") === path));

    if (path === "/" || path === "/dashboard") {
      const filename = this.firstContentFile();
      const meta = contentMeta[filename];
      this.showPage(meta ? `Editar: ${meta.label}` : `Editar: ${filename}`, () => window.Editor.render(filename));
    } else if (path.startsWith("/editor/")) {
      const filename = contentFileFromRoute(decodeURIComponent(path.replace("/editor/", "")));
      const meta = contentMeta[filename];
      this.showPage(meta ? `Editar: ${meta.label}` : `Editar: ${filename}`, () => window.Editor.render(filename));
    } else if (path === "/blog") this.showPage("Blog", () => window.Blog.renderList());
    else if (path === "/blog/new") this.showPage("Nueva publicacion", () => window.Blog.renderEditor(null));
    else if (path.startsWith("/blog/edit/")) {
      const slug = decodeURIComponent(path.replace("/blog/edit/", ""));
      this.showPage(`Editar: ${slug}`, () => window.Blog.renderEditor(slug));
    } else if (path === "/snapshots") this.showPage("Respaldos", () => window.Snapshots.render());
    else {
      const filename = this.firstContentFile();
      const meta = contentMeta[filename];
      this.showPage(meta ? `Editar: ${meta.label}` : `Editar: ${filename}`, () => window.Editor.render(filename));
    }
  },

  showPage(title: string, renderFn: () => void) {
    // Clear any editor action buttons that were portalled into the header by a
    // previous editor view, so they don't linger on Blog/Snapshots pages.
    window.CMSEditor?.unmountPrimitives?.();
    window.CMSBlog?.unmount?.();
    const headerContext = document.getElementById("header-context-actions");
    if (headerContext) headerContext.innerHTML = "";
    const headerEditorActions = document.getElementById("header-editor-actions");
    if (headerEditorActions) headerEditorActions.innerHTML = "";
    const headerTitle = document.getElementById("header-title");
    if (headerTitle) headerTitle.textContent = title;
    const main = document.getElementById("main-content");
    if (!main) return;
    main.innerHTML = '<div class="loading-state"><div class="spinner"></div> Cargando...</div>';
    Promise.resolve().then(() => renderFn());
  },

  async renderDashboard() {
    const main = document.getElementById("main-content");
    if (!main) return;
    try {
      const [contentData, blogData, snapshotData, publishData] = await Promise.all([
        window.API.listContent(),
        window.API.listBlog(),
        window.API.listSnapshots(),
        window.API.publishStatus().catch(() => null),
      ]);
      const files = contentData.files || [];
      main.innerHTML = '<div id="react-dashboard-root"></div>';
      const root = document.getElementById("react-dashboard-root");
      window.CMSDashboard?.mount(root, {
        files,
        posts: blogData.posts || [],
        snapshots: snapshotData.snapshots || [],
        publishData,
        contentTree: this.getContentTree(files),
        contentMeta,
        icons,
        onNavigate: (path: string) => this.navigate(path),
        onPublish: () => this.handlePublish(),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${this.escapeHtml(errMsg)}</p></div>`;
    }
  },

  getContentTree(files: string[]) {
    const existing = new Set(files.filter((file) => !hiddenContentFiles.has(file)));
    const seen = new Set<string>();
    const nodes = contentHierarchy.filter((entry) => existing.has(entry.parent)).map((entry) => {
      seen.add(entry.parent);
      const children = entry.children.filter((child) => existing.has(child));
      children.forEach((child) => seen.add(child));
      return { parent: entry.parent, children };
    });
    files.filter((file) => !hiddenContentFiles.has(file) && !seen.has(file)).forEach((file) => nodes.push({ parent: file, children: [] }));
    return nodes;
  },

  async handlePublish() {
    if (!confirm("Publicar el sitio? Esto creara un respaldo y reconstruira el sitio.")) return;
    try {
      await window.API.publish();
      window.Toast.success("Sitio publicado exitosamente");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      window.Toast.error(msg.length > 100 ? `Error al publicar: ${msg.slice(0, 120)}...` : `Error al publicar: ${msg}`);
      if (msg.length > 100) console.error("Full publish error:", msg);
    }
  },

  escapeHtml(str: unknown) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  },
};

export function registerAppController(): void {
  window.App = App;
  document.addEventListener("DOMContentLoaded", () => App.init());
}
