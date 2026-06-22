import React from "react";

type ContentMeta = Record<string, { label?: string; desc?: string }>;
type ContentNode = { parent: string; children: string[] };

type PublishData = {
  isPublishing?: boolean;
  isBuilding?: boolean;
  lastPublish?: {
    finished_at?: string;
    date?: string;
  } | null;
};

interface DashboardData {
  files: string[];
  posts: unknown[];
  snapshots: unknown[];
  publishData: PublishData;
  contentTree: ContentNode[];
  contentMeta: ContentMeta;
  icons: Record<string, string>;
  onNavigate: (path: string) => void;
  onPublish: () => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function editorPathFor(file: string) {
  return `/editor/${encodeURIComponent(file === "docentes.json" ? "maestros.json" : file)}`;
}

export default function DashboardView(props: DashboardData) {
  const { files, posts, snapshots, publishData, contentTree, contentMeta, icons, onNavigate, onPublish } = props;

  const isPublishing = Boolean(publishData?.isPublishing || publishData?.isBuilding);
  const lastPublishDate = publishData?.lastPublish?.finished_at || publishData?.lastPublish?.date;

  return (
    <>
      <div className="publish-banner">
        {isPublishing ? (
          <div className="text">
            <div className="spinner" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}></div>
            <strong>Publicando...</strong> El sitio se esta construyendo
          </div>
        ) : (
          <>
            <div className="text">
              {lastPublishDate
                ? `Ultima publicacion: ${new Date(lastPublishDate).toLocaleString("es-BO")}`
                : "No se ha publicado aun"}
            </div>
            <button className="btn btn-primary btn-sm" id="publish-btn-react" onClick={onPublish}>
              <span dangerouslySetInnerHTML={iconHtml(icons, "publish")}></span> Publicar sitio
            </button>
          </>
        )}
      </div>

      <div className="dashboard-grid mb-lg">
        <div className="stat-card">
          <div className="label">Archivos de contenido</div>
          <div className="value">{files.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Noticias</div>
          <div className="value">{posts.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Respaldos</div>
          <div className="value">{snapshots.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Contenido del sitio</div>
        </div>
        <div className="content-list">
          {contentTree.map((node) => {
            const parentMeta = contentMeta[node.parent] || { label: node.parent, desc: "" };
            return (
              <div className="content-tree-item" key={node.parent}>
                <button className="content-item" type="button" onClick={() => onNavigate(editorPathFor(node.parent))}>
                  <div>
                    <div className="name">{parentMeta.label || node.parent}</div>
                    <div className="desc">{parentMeta.desc || ""}</div>
                  </div>
                  <span className="arrow" dangerouslySetInnerHTML={iconHtml(icons, "arrow")}></span>
                </button>
                {node.children.length > 0 && (
                  <div className="content-children">
                    {node.children.map((child) => {
                      const childMeta = contentMeta[child] || { label: child, desc: child };
                      return (
                        <button
                          className="content-child"
                          type="button"
                          key={child}
                          onClick={() => onNavigate(`/editor/${encodeURIComponent(child)}`)}
                        >
                          <span className="dot"></span>
                          <span className="child-name">{childMeta.label || child}</span>
                          <span className="child-desc">{childMeta.desc || child}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
