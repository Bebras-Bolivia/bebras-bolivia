import React, { useState } from "react";

type Frontmatter = {
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
};

interface Props {
  isNew: boolean;
  slug: string;
  frontmatter: Frontmatter;
  body: string;
  icons: Record<string, string>;
  onBack: () => void;
  onSave: (payload: { slug: string; frontmatter: Frontmatter; body: string }) => Promise<void>;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

export default function BlogEditorView({ isNew, slug, frontmatter, body, icons, onBack, onSave }: Props) {
  const [formSlug, setFormSlug] = useState(slug || "");
  const [title, setTitle] = useState(frontmatter.title || "");
  const [description, setDescription] = useState(frontmatter.description || "");
  const [date, setDate] = useState(frontmatter.date || new Date().toISOString().split("T")[0]);
  const [author, setAuthor] = useState(frontmatter.author || "Bebras Bolivia");
  const [image, setImage] = useState(frontmatter.image || "");
  const [markdown, setMarkdown] = useState(body || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formSlug.trim() || !title.trim() || !description.trim() || !date) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        slug: formSlug.trim(),
        frontmatter: {
          title: title.trim(),
          description: description.trim(),
          date,
          author: author.trim() || "Bebras Bolivia",
          ...(image.trim() ? { image: image.trim() } : {}),
        },
        body: markdown,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="editor-toolbar">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            &larr; Volver al blog
          </button>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="spinner" style={{ width: "14px", height: "14px" }}></div> Guardando...
              </>
            ) : (
              <>
                <span dangerouslySetInnerHTML={iconHtml(icons, "save")}></span> {isNew ? "Crear" : "Guardar"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-form" id="blog-form-react">
          <div className="form-group">
            <label htmlFor="blog-slug-react">Slug (URL)</label>
            <input
              type="text"
              id="blog-slug-react"
              className="form-input mono"
              value={formSlug}
              placeholder="mi-nuevo-post"
              pattern="[a-z0-9\-]+"
              title="Solo letras minusculas, numeros y guiones"
              onChange={(e) => setFormSlug(e.target.value)}
              disabled={!isNew}
            />
            {isNew && (
              <span className="text-sm text-muted">
                Solo letras minusculas, numeros y guiones. No se puede cambiar despues.
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="blog-title-react">Titulo</label>
            <input type="text" id="blog-title-react" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="blog-desc-react">Descripcion</label>
            <textarea id="blog-desc-react" className="form-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="blog-date-react">Fecha</label>
            <input type="date" id="blog-date-react" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="blog-author-react">Autor</label>
            <input type="text" id="blog-author-react" className="form-input" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="blog-image-react">Imagen (ruta)</label>
            <input
              type="text"
              id="blog-image-react"
              className="form-input"
              value={image}
              placeholder="/images/mi-imagen.jpg"
              onChange={(e) => setImage(e.target.value)}
            />
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label htmlFor="blog-body-react">Contenido (Markdown)</label>
            <textarea
              id="blog-body-react"
              className="form-textarea mono"
              rows={20}
              style={{ minHeight: "300px" }}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="editor-preview" style={{ padding: "1.5rem", overflowY: "auto", background: "var(--bg-surface)", color: "var(--text)" }}>
          <div id="blog-preview-content" style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>
            <p className="text-muted">La vista previa de Markdown estara disponible en una futura version.</p>
          </div>
        </div>
      </div>
    </>
  );
}
