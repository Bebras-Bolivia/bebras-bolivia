// ── Bebras CMS — API Client ─────────────────────────────
// Thin wrapper around fetch with auth error handling.

const API = {
  /**
   * Generic fetch wrapper. Automatically:
   * - Adds Content-Type: application/json for non-FormData bodies
   * - Redirects to /login.html on 401
   * - Parses JSON response
   * - Provides clear error messages for network failures
   */
  async request(url, options = {}) {
    const opts = { ...options };

    // Set JSON headers unless sending FormData
    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers = {
        "Content-Type": "application/json",
        ...opts.headers,
      };
      if (typeof opts.body !== "string") {
        opts.body = JSON.stringify(opts.body);
      }
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (networkErr) {
      // Network-level errors (connection refused, DNS, offline, etc.)
      throw new Error(
        navigator.onLine
          ? "No se pudo conectar al servidor. Verifica que el CMS este ejecutandose."
          : "Sin conexion a internet."
      );
    }

    // Auth expired or invalid — redirect to login
    if (res.status === 401) {
      localStorage.removeItem("cms_user");
      window.location.href = "/login.html";
      throw new Error("Sesion expirada — redirigiendo al login");
    }

    // Try to parse JSON
    let data;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const err = new Error(
        typeof data === "object" && data.error ? data.error : `Error HTTP ${res.status}`
      );
      // Attach extra info for the UI to use
      err.status = res.status;
      err.details = typeof data === "object" && data.details ? data.details : null;
      throw err;
    }

    return data;
  },

  // ── Convenience methods ─────────────────────────────────

  get(url) {
    return this.request(url);
  },

  post(url, body) {
    return this.request(url, { method: "POST", body });
  },

  put(url, body) {
    return this.request(url, { method: "PUT", body });
  },

  del(url) {
    return this.request(url, { method: "DELETE" });
  },

  upload(url, formData) {
    return this.request(url, { method: "POST", body: formData });
  },

  // ── Auth ────────────────────────────────────────────────

  async checkAuth() {
    try {
      const data = await this.get("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await this.post("/api/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("cms_user");
    window.location.href = "/login.html";
  },

  // ── Content ─────────────────────────────────────────────

  listContent() {
    return this.get("/api/content");
  },

  getContent(filename) {
    return this.get(`/api/content/${encodeURIComponent(filename)}`);
  },

  saveContent(filename, data) {
    return this.put(`/api/content/${encodeURIComponent(filename)}`, data);
  },

  // ── Blog ────────────────────────────────────────────────

  listBlog() {
    return this.get("/api/blog");
  },

  getBlog(slug) {
    return this.get(`/api/blog/${encodeURIComponent(slug)}`);
  },

  createBlog(slug, frontmatter, body) {
    return this.post("/api/blog", { slug, frontmatter, body });
  },

  updateBlog(slug, frontmatter, body) {
    return this.put(`/api/blog/${encodeURIComponent(slug)}`, {
      frontmatter,
      body,
    });
  },

  deleteBlog(slug) {
    return this.del(`/api/blog/${encodeURIComponent(slug)}`);
  },

  // ── Snapshots ───────────────────────────────────────────

  listSnapshots() {
    return this.get("/api/snapshots");
  },

  getSnapshot(id) {
    return this.get(`/api/snapshots/${id}`);
  },

  createSnapshot(description) {
    return this.post("/api/snapshots", { description });
  },

  restoreSnapshot(id) {
    return this.post(`/api/snapshots/${id}/restore`);
  },

  deleteSnapshot(id) {
    return this.del(`/api/snapshots/${id}`);
  },

  // ── Publish ─────────────────────────────────────────────

  publish() {
    return this.post("/api/publish");
  },

  publishStatus() {
    return this.get("/api/publish/status");
  },

  // ── Preview ─────────────────────────────────────────────

  startPreview() {
    return this.post("/api/preview/start");
  },

  stopPreview() {
    return this.post("/api/preview/stop");
  },

  previewStatus() {
    return this.get("/api/preview/status");
  },

  syncPreview() {
    return this.post("/api/preview/sync");
  },

  // ── Media ───────────────────────────────────────────────

  listMedia() {
    return this.get("/api/media");
  },

  uploadMedia(file) {
    const fd = new FormData();
    fd.append("file", file);
    return this.upload("/api/media/upload", fd);
  },

  deleteMedia(filename) {
    return this.del(`/api/media/file/${encodeURIComponent(filename)}`);
  },
};

// ── Toast Notifications ──────────────────────────────────

const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement("div");
      this._container.className = "toast-container";
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = "info", duration = 4000) {
    const container = this._getContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "all 200ms ease-in";
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  success(msg) {
    this.show(msg, "success");
  },
  error(msg) {
    this.show(msg, "error", 6000);
  },
  info(msg) {
    this.show(msg, "info");
  },
};
