// ── Bebras CMS — Blog Manager ───────────────────────────
// List, create, edit, delete blog posts.
// Uses a plain textarea for markdown (EasyMDE can be added in Phase 5).

const Blog = {
  // ── Render blog post list ───────────────────────────────
  async renderList() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const data = await API.listBlog();
      const posts = data.posts || [];

      if (posts.length === 0) {
        main.innerHTML = `
          <div class="flex justify-between items-center mb-lg">
            <div></div>
            <button class="btn btn-primary btn-sm" id="blog-new-btn">${App.icon("plus")} Nuevo post</button>
          </div>
          <div class="empty-state">
            <h3>Sin publicaciones</h3>
            <p>Crea tu primer post del blog.</p>
          </div>`;
      } else {
        const listHtml = posts
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((post) => {
            const date = new Date(post.date).toLocaleDateString("es-BO", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return `
            <div class="blog-item" data-slug="${App.escapeHtml(post.slug)}">
              <div class="meta">
                <div class="title">${App.escapeHtml(post.title)}</div>
                <div class="info">${App.escapeHtml(post.slug)}.md &mdash; ${date} &mdash; ${App.escapeHtml(post.author || "Bebras Bolivia")}</div>
              </div>
              <div class="actions">
                <button class="btn btn-ghost btn-sm blog-edit-btn" data-slug="${App.escapeHtml(post.slug)}">${App.icon("edit")} Editar</button>
                <button class="btn btn-danger btn-sm blog-delete-btn" data-slug="${App.escapeHtml(post.slug)}">${App.icon("trash")}</button>
              </div>
            </div>`;
          })
          .join("");

        main.innerHTML = `
          <div class="flex justify-between items-center mb-lg">
            <span class="text-muted text-sm">${posts.length} publicacion${posts.length !== 1 ? "es" : ""}</span>
            <button class="btn btn-primary btn-sm" id="blog-new-btn">${App.icon("plus")} Nuevo post</button>
          </div>
          <div class="blog-list">${listHtml}</div>`;
      }

      if (window.CMSBlog && typeof window.CMSBlog.mountList === "function") {
        main.innerHTML = '<div id="react-blog-list-root"></div>';
        const blogRoot = document.getElementById("react-blog-list-root");
        if (blogRoot) {
          window.CMSBlog.mountList(blogRoot, {
            posts,
            icons: App.icons,
            onNew: () => App.navigate("/blog/new"),
            onEdit: (slug) => App.navigate(`/blog/edit/${encodeURIComponent(slug)}`),
            onDelete: (slug) => this.handleDelete(slug),
          });
          return;
        }
      }

      // Bind events
      const newBtn = document.getElementById("blog-new-btn");
      if (newBtn) {
        newBtn.addEventListener("click", () => App.navigate("/blog/new"));
      }

      main.querySelectorAll(".blog-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const slug = btn.getAttribute("data-slug");
          App.navigate(`/blog/edit/${encodeURIComponent(slug)}`);
        });
      });

      main.querySelectorAll(".blog-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const slug = btn.getAttribute("data-slug");
          this.handleDelete(slug);
        });
      });

      // Click on row to edit
      main.querySelectorAll(".blog-item").forEach((item) => {
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          const slug = item.getAttribute("data-slug");
          App.navigate(`/blog/edit/${encodeURIComponent(slug)}`);
        });
      });
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  },

  // ── Delete a post ───────────────────────────────────────
  async handleDelete(slug) {
    if (!confirm(`Eliminar el post "${slug}"? Esta accion no se puede deshacer.`)) {
      return;
    }

    try {
      await API.deleteBlog(slug);
      Toast.success("Post eliminado");
      this.renderList();
    } catch (err) {
      Toast.error(`Error al eliminar: ${err.message}`);
    }
  },

  // ── Render blog editor (create or edit) ─────────────────
  async renderEditor(slug) {
    const main = document.getElementById("main-content");
    if (!main) return;

    const isNew = !slug;
    let post = null;

    if (!isNew) {
      try {
        post = await API.getBlog(slug);
      } catch (err) {
        main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        return;
      }
    }

    const frontmatter = post
      ? post.frontmatter || {}
      : { title: "", description: "", date: new Date().toISOString().split("T")[0], author: "Bebras Bolivia", image: "" };
    const body = post ? post.body || "" : "";
    const currentSlug = slug || "";

    if (window.CMSBlog && typeof window.CMSBlog.mountEditor === "function") {
      main.innerHTML = '<div id="react-blog-editor-root"></div>';
      const root = document.getElementById("react-blog-editor-root");
      if (root) {
        window.CMSBlog.mountEditor(root, {
          isNew,
          slug: currentSlug,
          frontmatter: {
            title: frontmatter.title || "",
            description: frontmatter.description || "",
            date: this.formatDate(frontmatter.date),
            author: frontmatter.author || "Bebras Bolivia",
            image: frontmatter.image || "",
          },
          body,
          icons: App.icons,
          onBack: () => App.navigate("/blog"),
          onSave: async ({ slug: nextSlug, frontmatter: nextFrontmatter, body: nextBody }) => {
            if (!nextSlug) {
              Toast.error("El slug es obligatorio");
              return;
            }
            if (!nextFrontmatter.title) {
              Toast.error("El titulo es obligatorio");
              return;
            }
            if (!nextFrontmatter.description) {
              Toast.error("La descripcion es obligatoria");
              return;
            }
            if (!nextFrontmatter.date) {
              Toast.error("La fecha es obligatoria");
              return;
            }

            if (isNew) {
              await API.createBlog(nextSlug, nextFrontmatter, nextBody);
              Toast.success("Post creado");
              App.navigate(`/blog/edit/${encodeURIComponent(nextSlug)}`);
            } else {
              await API.updateBlog(currentSlug, nextFrontmatter, nextBody);
              Toast.success("Post guardado");
            }
          },
        });
        return;
      }
    }

    main.innerHTML = `
      <div class="editor-toolbar">
        <div>
          <button class="btn btn-ghost btn-sm" id="blog-back">&larr; Volver al blog</button>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-primary btn-sm" id="blog-save">${App.icon("save")} ${isNew ? "Crear" : "Guardar"}</button>
        </div>
      </div>

      <div class="editor-layout">
        <div class="editor-form" id="blog-form">
          <!-- Slug -->
          <div class="form-group">
            <label for="blog-slug">Slug (URL)</label>
            <input type="text" id="blog-slug" class="form-input mono"
              value="${App.escapeHtml(currentSlug)}"
              placeholder="mi-nuevo-post"
              ${isNew ? "" : "disabled"}
              pattern="[a-z0-9\\-]+"
              title="Solo letras minusculas, numeros y guiones">
            ${isNew ? '<span class="text-sm text-muted">Solo letras minusculas, numeros y guiones. No se puede cambiar despues.</span>' : ""}
          </div>

          <!-- Title -->
          <div class="form-group">
            <label for="blog-title">Titulo</label>
            <input type="text" id="blog-title" class="form-input" value="${App.escapeHtml(frontmatter.title)}" required>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="blog-desc">Descripcion</label>
            <textarea id="blog-desc" class="form-textarea" rows="2">${App.escapeHtml(frontmatter.description)}</textarea>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label for="blog-date">Fecha</label>
            <input type="date" id="blog-date" class="form-input" value="${this.formatDate(frontmatter.date)}">
          </div>

          <!-- Author -->
          <div class="form-group">
            <label for="blog-author">Autor</label>
            <input type="text" id="blog-author" class="form-input" value="${App.escapeHtml(frontmatter.author || "Bebras Bolivia")}">
          </div>

          <!-- Image -->
          <div class="form-group">
            <label for="blog-image">Imagen (ruta)</label>
            <input type="text" id="blog-image" class="form-input" value="${App.escapeHtml(frontmatter.image || "")}" placeholder="/images/mi-imagen.jpg">
          </div>

          <div class="divider"></div>

          <!-- Markdown body -->
          <div class="form-group">
            <label for="blog-body">Contenido (Markdown)</label>
            <textarea id="blog-body" class="form-textarea mono" rows="20" style="min-height:300px;">${App.escapeHtml(body)}</textarea>
          </div>
        </div>

        <div class="editor-preview" style="padding:1.5rem;overflow-y:auto;background:var(--bg-surface);color:var(--text);">
          <div id="blog-preview-content" style="font-size:0.875rem;line-height:1.7;">
            <p class="text-muted">La vista previa de Markdown estara disponible en una futura version.</p>
          </div>
        </div>
      </div>`;

    // Bind events
    document.getElementById("blog-back").addEventListener("click", () => {
      App.navigate("/blog");
    });

    document.getElementById("blog-save").addEventListener("click", () => {
      this.handleSave(isNew, slug);
    });
  },

  // ── Save/Create handler ─────────────────────────────────
  async handleSave(isNew, originalSlug) {
    const saveBtn = document.getElementById("blog-save");
    const slugVal = document.getElementById("blog-slug").value.trim();
    const title = document.getElementById("blog-title").value.trim();
    const description = document.getElementById("blog-desc").value.trim();
    const date = document.getElementById("blog-date").value;
    const author = document.getElementById("blog-author").value.trim();
    const image = document.getElementById("blog-image").value.trim();
    const body = document.getElementById("blog-body").value;

    // Validate
    if (!slugVal) {
      Toast.error("El slug es obligatorio");
      return;
    }
    if (!title) {
      Toast.error("El titulo es obligatorio");
      return;
    }
    if (!description) {
      Toast.error("La descripcion es obligatoria");
      return;
    }
    if (!date) {
      Toast.error("La fecha es obligatoria");
      return;
    }

    const frontmatter = { title, description, date, author: author || "Bebras Bolivia" };
    if (image) frontmatter.image = image;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Guardando...';

    try {
      if (isNew) {
        await API.createBlog(slugVal, frontmatter, body);
        Toast.success("Post creado");
        App.navigate(`/blog/edit/${encodeURIComponent(slugVal)}`);
      } else {
        await API.updateBlog(originalSlug, frontmatter, body);
        Toast.success("Post guardado");
      }
    } catch (err) {
      Toast.error(`Error: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${App.icon("save")} ${isNew ? "Crear" : "Guardar"}`;
    }
  },

  // ── Helpers ─────────────────────────────────────────────
  formatDate(dateVal) {
    if (!dateVal) return new Date().toISOString().split("T")[0];
    try {
      const d = new Date(dateVal);
      return d.toISOString().split("T")[0];
    } catch {
      return dateVal;
    }
  },
};
