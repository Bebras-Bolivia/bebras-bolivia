declare global {
  interface Window {
    API: any;
    Toast: any;
    App: any;
    CMSBlog?: any;
    Blog?: any;
  }
}

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
    } catch (err: any) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  async handleDelete(slug: string) {
    if (!confirm(`Eliminar el post "${slug}"? Esta accion no se puede deshacer.`)) return;

    try {
      await window.API.deleteBlog(slug);
      window.Toast.success("Post eliminado");
      this.renderList();
    } catch (err: any) {
      window.Toast.error(`Error al eliminar: ${err.message}`);
    }
  },

  async renderEditor(slug: string | null) {
    const main = document.getElementById("main-content");
    if (!main) return;

    const isNew = !slug;
    let post: any = null;

    if (!isNew) {
      try {
        post = await window.API.getBlog(slug);
      } catch (err: any) {
        main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
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
        date: formatDate(frontmatter.date),
        author: frontmatter.author || "Bebras Bolivia",
        image: frontmatter.image || "",
      },
      body,
      icons: window.App.icons,
      onBack: () => window.App.navigate("/blog"),
      onSave: async ({ slug: nextSlug, frontmatter: nextFrontmatter, body: nextBody }: any) => {
        if (!nextSlug) return window.Toast.error("El slug es obligatorio");
        if (!nextFrontmatter.title) return window.Toast.error("El titulo es obligatorio");
        if (!nextFrontmatter.description) return window.Toast.error("La descripcion es obligatoria");
        if (!nextFrontmatter.date) return window.Toast.error("La fecha es obligatoria");

        try {
          if (isNew) {
            await window.API.createBlog(nextSlug, nextFrontmatter, nextBody);
            window.Toast.success("Post creado");
            window.App.navigate(`/blog/edit/${encodeURIComponent(nextSlug)}`);
          } else {
            await window.API.updateBlog(currentSlug, nextFrontmatter, nextBody);
            window.Toast.success("Post guardado");
          }
        } catch (err: any) {
          window.Toast.error(`Error: ${err.message}`);
        }
      },
    });
  },
};

export function registerBlogController(): void {
  window.Blog = Blog;
}
