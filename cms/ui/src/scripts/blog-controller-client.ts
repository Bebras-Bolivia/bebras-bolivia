
function formatDate(dateVal: string): string {
  if (!dateVal) return new Date().toISOString().split("T")[0];
  try {
    return new Date(dateVal).toISOString().split("T")[0];
  } catch {
    return dateVal;
  }
}

const Blog = {
  async renderList() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const data = await window.API.listBlog();
      const posts = data.posts || [];

      main.innerHTML = '<div id="react-blog-list-root"></div>';
      const root = document.getElementById("react-blog-list-root");
      if (!root || !window.CMSBlog?.mountList) return;

      window.CMSBlog.mountList(root, {
        posts,
        icons: window.App.icons,
        onNew: () => window.App.navigate("/blog/new"),
        onEdit: (slug: string) => window.App.navigate(`/blog/edit/${encodeURIComponent(slug)}`),
        onDelete: (slug: string) => this.handleDelete(slug),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(errMsg)}</p></div>`;
    }
  },

  async handleDelete(slug: string) {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: "Eliminar publicacion",
      message: `Eliminar la publicacion "${slug}"? Esta accion no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await window.API.deleteBlog(slug);
      window.Toast.success("Publicacion eliminada");
      this.renderList();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      window.Toast.error(`Error al eliminar: ${errMsg}`);
    }
  },

  async renderEditor(slug: string | null) {
    const main = document.getElementById("main-content");
    if (!main) return;

    const isNew = !slug;
    let post: { frontmatter?: { title?: string; description?: string; date?: string; author?: string; image?: string }; body?: string } | null = null;

    if (!isNew) {
      try {
        post = await window.API.getBlog(slug);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(errMsg)}</p></div>`;
        return;
      }
    }

    const frontmatter = post
      ? post.frontmatter || {}
      : { title: "", description: "", date: new Date().toISOString().split("T")[0], author: "Bebras Bolivia", image: "" };
    const body = post ? post.body || "" : "";
    const currentSlug = slug || "";

    main.innerHTML = '<div id="react-blog-editor-root"></div>';
    const root = document.getElementById("react-blog-editor-root");
    if (!root || !window.CMSBlog?.mountEditor) return;

    window.CMSBlog.mountEditor(root, {
      isNew,
      slug: currentSlug,
      frontmatter: {
        title: frontmatter.title || "",
        description: frontmatter.description || "",
        date: formatDate(frontmatter.date || ""),
        author: frontmatter.author || "Bebras Bolivia",
        image: frontmatter.image || "",
      },
      body,
      icons: window.App.icons,
      onBack: () => window.App.navigate("/blog"),
      onSave: async ({
        slug: nextSlug,
        frontmatter: nextFrontmatter,
        body: nextBody,
      }: {
        slug: string;
        frontmatter: {
          title: string;
          description: string;
          date: string;
          author: string;
          image?: string;
        };
        body: string;
      }) => {
        if (!nextSlug) return window.Toast.error("El slug es obligatorio");
        if (nextSlug.length > 80) return window.Toast.error("El slug es demasiado largo");
        if (!nextFrontmatter.title) return window.Toast.error("El titulo es obligatorio");
        if (nextFrontmatter.title.length > 120) return window.Toast.error("El titulo es demasiado largo");
        if (!nextFrontmatter.description) return window.Toast.error("La descripcion es obligatoria");
        if (nextFrontmatter.description.length > 280) return window.Toast.error("La descripcion es demasiado larga");
        if (!nextFrontmatter.date) return window.Toast.error("La fecha es obligatoria");
        if (nextBody.length > 50000) return window.Toast.error("El contenido es demasiado largo");

        try {
          if (isNew) {
            await window.API.createBlog(nextSlug, nextFrontmatter, nextBody);
            window.Toast.success("Publicacion creada");
            window.App.navigate(`/blog/edit/${encodeURIComponent(nextSlug)}`);
          } else {
            await window.API.updateBlog(currentSlug, nextFrontmatter, nextBody);
            window.Toast.success("Publicacion guardada");
          }
        } catch (err: unknown) {
          window.Toast.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  },
};

export function registerBlogController(): void {
  window.Blog = Blog;
}
