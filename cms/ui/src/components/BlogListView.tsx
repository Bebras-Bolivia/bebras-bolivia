import React from "react";

type BlogPost = {
  slug: string;
  frontmatter?: {
    title?: string;
    date?: string;
    author?: string;
  };
};

interface Props {
  posts: BlogPost[];
  icons: Record<string, string>;
  onNew: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function formatPostDate(value?: string) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogListView({ posts, icons, onNew, onEdit, onDelete }: Props) {
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const dateA = new Date(a?.frontmatter?.date || 0).getTime();
    const dateB = new Date(b?.frontmatter?.date || 0).getTime();
    return dateB - dateA;
  });

  if (sortedPosts.length === 0) {
    return (
      <>
        <div className="flex justify-between items-center mb-lg">
          <div></div>
          <button className="btn btn-primary btn-sm" onClick={onNew}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "plus")}></span> Nuevo post
          </button>
        </div>
        <div className="empty-state">
          <h3>Sin publicaciones</h3>
          <p>Crea tu primer post del blog.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-lg">
        <span className="text-muted text-sm">
          {sortedPosts.length} publicacion{sortedPosts.length !== 1 ? "es" : ""}
        </span>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <span dangerouslySetInnerHTML={iconHtml(icons, "plus")}></span> Nuevo post
        </button>
      </div>
      <div className="blog-list">
        {sortedPosts.map((post) => {
          const slug = post.slug;
          const title = post.frontmatter?.title || slug;
          const author = post.frontmatter?.author || "Bebras Bolivia";
          const date = formatPostDate(post.frontmatter?.date);

          return (
            <div className="blog-item" key={slug} style={{ cursor: "pointer" }} onClick={() => onEdit(slug)}>
              <div className="meta">
                <div className="title">{title}</div>
                <div className="info">
                  {slug}.md &mdash; {date} &mdash; {author}
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(slug);
                  }}
                >
                  <span dangerouslySetInnerHTML={iconHtml(icons, "edit")}></span> Editar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(slug);
                  }}
                >
                  <span dangerouslySetInnerHTML={iconHtml(icons, "trash")}></span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
