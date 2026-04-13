// ── Bebras CMS — SPA Router + Dashboard ─────────────────
// Handles client-side routing, shell initialization, and the dashboard page.

const App = {
  currentPage: null,
  user: null,

  // ── Content file metadata for display ───────────────────
  contentMeta: {
    "site.json": { label: "Sitio", desc: "Nombre, URL, meta tags globales", icon: "globe" },
    "navigation.json": { label: "Navegacion", desc: "Navbar, footer, links sociales", icon: "menu" },
    "hero.json": { label: "Hero", desc: "Banner principal, CTAs, estadisticas", icon: "zap" },
    "about.json": { label: "Acerca de", desc: "Seccion que es Bebras, tarjetas", icon: "info" },
    "categories.json": { label: "Categorias", desc: "Grupos de edad y descripcion", icon: "layers" },
    "scoring.json": { label: "Puntaje", desc: "Tabla de puntajes, resumen", icon: "bar-chart" },
    "news.json": { label: "Noticias", desc: "Slides del carrusel de noticias", icon: "newspaper" },
    "faq.json": { label: "FAQ", desc: "Preguntas frecuentes por categoria", icon: "help-circle" },
    "teacher-instructions.json": { label: "Docentes (guia)", desc: "Instrucciones en tabs", icon: "book-open" },
    "sponsors.json": { label: "Sponsors", desc: "Patrocinadores y anchor", icon: "heart" },
    "contact.json": { label: "Contacto", desc: "Info de contacto, formulario", icon: "mail" },
    "registro.json": { label: "Registro", desc: "Pagina de registro (inscripcion)", icon: "user-plus" },
    "estudiantes.json": { label: "Estudiantes", desc: "Pagina de estudiantes (secciones)", icon: "graduation-cap" },
    "docentes.json": { label: "Docentes", desc: "Pagina de docentes (secciones)", icon: "briefcase" },
    "blog-ui.json": { label: "Blog UI", desc: "Textos de la interfaz del blog", icon: "file-text" },
    "blog-content": { label: "Publicaciones", desc: "Entradas del blog", icon: "layers" },
    "custom-pages.json": { label: "Paginas personalizadas", desc: "Paginas dinamicas creadas desde CMS", icon: "layers" },
    "page-composition.json": { label: "Composicion de paginas", desc: "Orden y posicion de subsecciones hijas", icon: "move" },
  },

  // ── Content hierarchy (parent page -> child sections) ───
  contentHierarchy: [
    {
      label: "Inicio",
      parent: "site.json",
      children: ["navigation.json", "hero.json", "about.json", "categories.json", "news.json"],
    },
    {
      label: "Estudiantes",
      parent: "estudiantes.json",
      children: ["scoring.json"],
    },
    {
      label: "Docentes",
      parent: "docentes.json",
      children: ["teacher-instructions.json"],
    },
    {
      label: "FAQ",
      parent: "faq.json",
      children: [],
    },
    {
      label: "Blog",
      parent: "blog-ui.json",
      children: [],
    },
    {
      label: "Sponsors",
      parent: "sponsors.json",
      children: [],
    },
    {
      label: "Contacto",
      parent: "contact.json",
      children: [],
    },
    {
      label: "Registro",
      parent: "registro.json",
      children: [],
    },
    {
      label: "Paginas personalizadas",
      parent: "custom-pages.json",
      children: ["page-composition.json"],
    },
  ],

  // ── SVG icons (inline, small set) ───────────────────────
  icons: {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
    snapshot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>',
    publish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  },

  icon(name) {
    return this.icons[name] || "";
  },

  // ── Initialize ──────────────────────────────────────────
  async init() {
    // Check authentication
    this.user = await API.checkAuth();
    if (!this.user) {
      window.location.href = "/login.html";
      return;
    }

    // Store user info
    localStorage.setItem("cms_user", JSON.stringify(this.user));

    // Populate sidebar user
    this.renderSidebarUser();

    // Setup navigation
    this.setupNav();

    // Render hierarchical content tree in sidebar
    await this.renderSidebarContentTree();

    // Setup mobile sidebar toggle
    this.setupMobileSidebar();

    // Route to current page
    this.route();

    // Listen for popstate (browser back/forward)
    window.addEventListener("popstate", () => this.route());
  },

  renderSidebarUser() {
    const userEl = document.getElementById("sidebar-user");
    if (!userEl || !this.user) return;

    const initials = (this.user.name || "A")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    userEl.innerHTML = `
      <div class="avatar">${initials}</div>
      <div class="info">
        <div class="name">${this.escapeHtml(this.user.name)}</div>
        <div class="email">${this.escapeHtml(this.user.email)}</div>
      </div>
    `;
  },

  // ── Navigation setup ────────────────────────────────────
  setupNav() {
    // Sidebar link clicks (delegated, supports dynamic tree entries)
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (sidebarNav) {
      sidebarNav.addEventListener("click", (e) => {
        const target = e.target.closest("[data-nav]");
        if (!target) return;
        e.preventDefault();
        const path = target.getAttribute("data-nav");
        this.navigate(path);
        this.closeMobileSidebar();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        API.logout();
      });
    }
  },

  // ── Mobile sidebar toggle ──────────────────────────────
  setupMobileSidebar() {
    const menuBtn = document.getElementById("mobile-menu-btn");
    const overlay = document.getElementById("sidebar-overlay");
    const sidebar = document.querySelector(".sidebar");

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        this.toggleMobileSidebar();
      });
    }

    if (overlay) {
      overlay.addEventListener("click", () => {
        this.closeMobileSidebar();
      });
    }

    // Close sidebar on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
        this.closeMobileSidebar();
      }
    });
  },

  toggleMobileSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains("open");
    if (isOpen) {
      this.closeMobileSidebar();
    } else {
      sidebar.classList.add("open");
      if (overlay) overlay.classList.add("active");
    }
  },

  closeMobileSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  },

  navigate(path) {
    if (window.location.pathname === path) return;
    history.pushState(null, "", path);
    this.route();
  },

  async renderSidebarContentTree() {
    const container = document.getElementById("sidebar-content-tree");
    if (!container) return;

    try {
      const contentData = await API.listContent();
      const files = contentData.files || [];
      const tree = this.getContentTree(files);

      let html = tree
        .map((node) => {
          const parentMeta = this.contentMeta[node.parent] || { label: node.parent, icon: "edit" };
          const childrenHtml = node.children
            .map((child) => {
              const childMeta = this.contentMeta[child] || { label: child };
              return `<a class="sidebar-tree-child" data-nav="/editor/${this.escapeHtml(child)}" href="/editor/${this.escapeHtml(child)}">${this.escapeHtml(childMeta.label)}</a>`;
            })
            .join("");

          return `
            <div class="sidebar-tree-group">
              <a class="sidebar-tree-parent" data-nav="/editor/${this.escapeHtml(node.parent)}" href="/editor/${this.escapeHtml(node.parent)}">
                ${this.icon(parentMeta.icon || "edit")}
                <span>${this.escapeHtml(parentMeta.label)}</span>
              </a>
              ${node.children.length ? `<div class="sidebar-tree-children">${childrenHtml}</div>` : ""}
            </div>
          `;
        })
        .join("");

      html += `
        <div class="sidebar-tree-group">
          <a class="sidebar-tree-parent" data-nav="/blog" href="/blog">
            ${this.icon("layers")}
            <span>Publicaciones</span>
          </a>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="sidebar-tree-loading">No se pudo cargar el contenido</div>`;
      console.error("Failed to render sidebar content tree", err);
    }
  },

  // ── Router ──────────────────────────────────────────────
  route() {
    const path = window.location.pathname;

    // Update active sidebar link
    document.querySelectorAll("[data-nav]").forEach((el) => {
      const navPath = el.getAttribute("data-nav");
      el.classList.toggle("active", navPath === path);
    });

    // Route matching
    if (path === "/" || path === "/dashboard") {
      this.showPage("Dashboard", () => this.renderDashboard());
    } else if (path.startsWith("/editor/")) {
      const filename = decodeURIComponent(path.replace("/editor/", ""));
      const meta = this.contentMeta[filename];
      const title = meta ? `Editar: ${meta.label}` : `Editar: ${filename}`;
      this.showPage(title, () => Editor.render(filename));
    } else if (path === "/blog") {
      this.showPage("Blog", () => Blog.renderList());
    } else if (path === "/blog/new") {
      this.showPage("Nuevo post", () => Blog.renderEditor(null));
    } else if (path.startsWith("/blog/edit/")) {
      const slug = decodeURIComponent(path.replace("/blog/edit/", ""));
      this.showPage(`Editar: ${slug}`, () => Blog.renderEditor(slug));
    } else if (path === "/snapshots") {
      this.showPage("Snapshots", () => Snapshots.render());
    } else {
      this.showPage("Dashboard", () => this.renderDashboard());
    }
  },

  showPage(title, renderFn) {
    // Update header title
    const headerTitle = document.getElementById("header-title");
    if (headerTitle) headerTitle.textContent = title;

    // Clear main and render
    const main = document.getElementById("main-content");
    if (main) {
      main.innerHTML = '<div class="loading-state"><div class="spinner"></div> Cargando...</div>';
      // Use microtask so loading spinner paints
      Promise.resolve().then(() => renderFn());
    }
  },

  // ── Dashboard ───────────────────────────────────────────
  async renderDashboard() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      // Fetch data in parallel
      const [contentData, blogData, snapshotData, publishData] =
        await Promise.all([
          API.listContent(),
          API.listBlog(),
          API.listSnapshots(),
          API.publishStatus().catch(() => null),
        ]);

      const files = contentData.files || [];
      const posts = blogData.posts || [];
      const snapshots = snapshotData.snapshots || [];

      // Build publish banner
      let publishBanner = "";
      if (publishData && publishData.isBuilding) {
        publishBanner = `
          <div class="publish-banner">
            <div class="text"><div class="spinner" style="display:inline-block;vertical-align:middle;margin-right:8px;"></div> <strong>Publicando...</strong> El sitio se esta construyendo</div>
          </div>`;
      } else {
        const lastPublish =
          publishData && publishData.lastPublish
            ? `Ultima publicacion: ${new Date(publishData.lastPublish.date).toLocaleString("es-BO")}`
            : "No se ha publicado aun";
        publishBanner = `
          <div class="publish-banner">
            <div class="text">${lastPublish}</div>
            <button class="btn btn-primary btn-sm" id="publish-btn">${this.icon("publish")} Publicar sitio</button>
          </div>`;
      }

      // Build stats
      const statsHtml = `
        <div class="dashboard-grid mb-lg">
          <div class="stat-card">
            <div class="label">Archivos de contenido</div>
            <div class="value">${files.length}</div>
          </div>
          <div class="stat-card">
            <div class="label">Posts del blog</div>
            <div class="value">${posts.length}</div>
          </div>
          <div class="stat-card">
            <div class="label">Snapshots</div>
            <div class="value">${snapshots.length}</div>
          </div>
        </div>`;

      const contentTree = this.getContentTree(files);
      const contentListHtml = contentTree
        .map((node) => {
          const parentMeta = this.contentMeta[node.parent] || { label: node.parent, desc: "" };
          const childrenHtml = node.children
            .map((child) => {
              const childMeta = this.contentMeta[child] || { label: child, desc: "" };
              return `
                <button class="content-child" type="button" data-file="${this.escapeHtml(child)}">
                  <span class="dot"></span>
                  <span class="child-name">${this.escapeHtml(childMeta.label)}</span>
                  <span class="child-desc">${this.escapeHtml(childMeta.desc || child)}</span>
                </button>`;
            })
            .join("");

          return `
            <div class="content-tree-item">
              <div class="content-item" data-file="${this.escapeHtml(node.parent)}">
                <div>
                  <div class="name">${this.escapeHtml(parentMeta.label)}</div>
                  <div class="desc">${this.escapeHtml(parentMeta.desc)}</div>
                </div>
                <span class="arrow">${this.icon("arrow")}</span>
              </div>
              ${node.children.length ? `<div class="content-children">${childrenHtml}</div>` : ""}
            </div>`;
        })
        .join("");

      if (window.CMSDashboard && typeof window.CMSDashboard.mount === "function") {
        main.innerHTML = '<div id="react-dashboard-root"></div>';
        const root = document.getElementById("react-dashboard-root");
        if (root) {
          window.CMSDashboard.mount(root, {
            files,
            posts,
            snapshots,
            publishData,
            contentTree,
            contentMeta: this.contentMeta,
            icons: this.icons,
            onNavigate: (path) => this.navigate(path),
            onPublish: () => this.handlePublish(),
          });
        }
      } else {
        main.innerHTML = `
          ${publishBanner}
          ${statsHtml}
          <div class="card">
            <div class="card-header">
              <div class="card-title">Contenido del sitio</div>
            </div>
            <div class="content-list">
              ${contentListHtml}
            </div>
          </div>`;

        // Bind events
        main.querySelectorAll(".content-item, .content-child").forEach((item) => {
          item.addEventListener("click", () => {
            const file = item.getAttribute("data-file");
            this.navigate(`/editor/${encodeURIComponent(file)}`);
          });
        });

        const publishBtn = document.getElementById("publish-btn");
        if (publishBtn) {
          publishBtn.addEventListener("click", () => this.handlePublish());
        }
      }
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${this.escapeHtml(err.message)}</p></div>`;
    }
  },

  getContentTree(files) {
    const existing = new Set(files);
    const seen = new Set();

    const nodes = this.contentHierarchy
      .filter((entry) => existing.has(entry.parent))
      .map((entry) => {
        seen.add(entry.parent);
        const validChildren = entry.children.filter((child) => existing.has(child));
        validChildren.forEach((child) => seen.add(child));
        return { parent: entry.parent, children: validChildren };
      });

    const leftovers = files.filter((f) => !seen.has(f));
    leftovers.forEach((f) => nodes.push({ parent: f, children: [] }));

    return nodes;
  },

  async handlePublish() {
    const btn = document.getElementById("publish-btn");
    if (!btn) return;

    if (!confirm("Publicar el sitio? Esto creara un snapshot y reconstruira el sitio.")) {
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Publicando...';

    try {
      await API.publish();
      Toast.success("Sitio publicado exitosamente");
      this.renderDashboard();
    } catch (err) {
      // Show longer error messages in a more readable way
      const msg = err.message || "Error desconocido";
      if (msg.length > 100) {
        // Long error (likely build output) — show truncated in toast + full in console
        Toast.error(`Error al publicar: ${msg.slice(0, 120)}...`);
        console.error("Full publish error:", msg);
      } else {
        Toast.error(`Error al publicar: ${msg}`);
      }
      btn.disabled = false;
      btn.innerHTML = `${this.icon("publish")} Publicar sitio`;
    }
  },

  // ── Helpers ─────────────────────────────────────────────

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  },
};

window.CMSDashboard = window.CMSDashboard || null;
window.CMSBlog = window.CMSBlog || null;
window.CMSSnapshots = window.CMSSnapshots || null;

// ── Boot ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => App.init());
