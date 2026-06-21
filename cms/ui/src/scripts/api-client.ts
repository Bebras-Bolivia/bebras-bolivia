
const API = {
  basePath: (window.CMS_BASE_PATH || "").replace(/\/$/, ""),

  url(path: string) {
    if (!path.startsWith("/")) return path;
    return `${this.basePath}${path}`;
  },

  async request(url: string, options: RequestInit = {}) {
    const opts: RequestInit = { ...options };
    const requestUrl = this.url(url);

    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers = {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      };
      if (typeof opts.body !== "string") {
        opts.body = JSON.stringify(opts.body);
      }
    }

    let res: Response;
    try {
      res = await fetch(requestUrl, opts);
    } catch {
      throw new Error(navigator.onLine
        ? "No se pudo conectar al servidor. Verifica que el CMS este ejecutandose."
        : "Sin conexion a internet.");
    }

    if (res.status === 401) {
      localStorage.removeItem("cms_user");
      window.location.href = this.url("/login.html");
      throw new Error("Sesion expirada - redirigiendo al login");
    }

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const err = new Error(typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : `Error HTTP ${res.status}`) as Error & { status?: number; details?: unknown };
      err.status = res.status;
      err.details = typeof data === "object" && data && "details" in data ? data.details : null;
      throw err;
    }

    return data;
  },

  get(url: string) { return this.request(url); },
  post(url: string, body?: unknown) { return this.request(url, { method: "POST", body: body as BodyInit }); },
  put(url: string, body?: unknown) { return this.request(url, { method: "PUT", body: body as BodyInit }); },
  del(url: string) { return this.request(url, { method: "DELETE" }); },
  upload(url: string, formData: FormData) { return this.request(url, { method: "POST", body: formData }); },

  async checkAuth() {
    try {
      const data = await this.get("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  },

  async logout() {
    try { await this.post("/api/auth/logout"); } catch {}
    localStorage.removeItem("cms_user");
    window.location.href = this.url("/login.html");
  },

  listContent() { return this.get("/api/content"); },
  getContent(filename: string) { return this.get(`/api/content/${encodeURIComponent(filename)}`); },
  saveContent(filename: string, data: unknown) { return this.put(`/api/content/${encodeURIComponent(filename)}`, data); },

  listBlog() { return this.get("/api/blog"); },
  getBlog(slug: string) { return this.get(`/api/blog/${encodeURIComponent(slug)}`); },
  createBlog(slug: string, frontmatter: unknown, body: string) { return this.post("/api/blog", { slug, frontmatter, body }); },
  updateBlog(slug: string, frontmatter: unknown, body: string) { return this.put(`/api/blog/${encodeURIComponent(slug)}`, { frontmatter, body }); },
  deleteBlog(slug: string) { return this.del(`/api/blog/${encodeURIComponent(slug)}`); },

  listSnapshots() { return this.get("/api/snapshots"); },
  getSnapshot(id: number) { return this.get(`/api/snapshots/${id}`); },
  createSnapshot(description: string) { return this.post("/api/snapshots", { description }); },
  restoreSnapshot(id: number) { return this.post(`/api/snapshots/${id}/restore`); },
  deleteSnapshot(id: number) { return this.del(`/api/snapshots/${id}`); },

  publish() { return this.post("/api/publish"); },
  publishStatus() { return this.get("/api/publish/status"); },

  startPreview() { return this.post("/api/preview/start"); },
  stopPreview() { return this.post("/api/preview/stop"); },
  previewStatus() { return this.get("/api/preview/status"); },
  syncPreview() { return this.post("/api/preview/sync"); },
  syncPreviewDraft(filename: string, data: unknown) { return this.post("/api/preview/draft", { filename, data }); },
  syncBlogPreviewDraft(slug: string, frontmatter: unknown, body: string, usePreviewSlug = false) {
    return this.post("/api/preview/blog-draft", { slug, frontmatter, body, usePreviewSlug });
  },
  cleanupBlogPreviewDraft() { return this.post("/api/preview/blog-draft/cleanup"); },

  listMedia() { return this.get("/api/media"); },
  uploadMedia(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return this.upload("/api/media/upload", fd);
  },
  deleteMedia(filename: string) { return this.del(`/api/media/file/${encodeURIComponent(filename)}`); },
};

const Toast = {
  _container: null as HTMLDivElement | null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement("div");
      this._container.className = "toast-container";
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message: string, type = "info", duration = 4000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this._getContainer().appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "all 200ms ease-in";
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  success(message: string) { this.show(message, "success"); },
  error(message: string) { this.show(message, "error", 6000); },
  info(message: string) { this.show(message, "info"); },
};

export function registerApiClient(): void {
  window.API = API;
  window.Toast = Toast;
}
