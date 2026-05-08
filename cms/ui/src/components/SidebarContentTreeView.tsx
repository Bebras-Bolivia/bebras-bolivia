import React from "react";

type Node = {
  parent: string;
  children: string[];
  parentLabel: string;
  parentIcon: string;
  childrenMeta: Array<{ key: string; label: string }>;
};

interface Props {
  nodes: Node[];
  icons: Record<string, string>;
  onNavigate: (path: string) => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function editorPathFor(file: string) {
  return `/editor/${encodeURIComponent(file === "docentes.json" ? "maestros.json" : file)}`;
}

export default function SidebarContentTreeView({ nodes, icons, onNavigate }: Props) {
  return (
    <>
      {nodes.map((node) => (
        <div className="sidebar-tree-group" key={node.parent}>
          <a
            className="sidebar-tree-parent"
            data-nav={editorPathFor(node.parent)}
            href={editorPathFor(node.parent)}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(editorPathFor(node.parent));
            }}
          >
            <span dangerouslySetInnerHTML={iconHtml(icons, node.parentIcon || "edit")}></span>
            <span>{node.parentLabel}</span>
          </a>
          {node.children.length > 0 && (
            <div className="sidebar-tree-children">
              {node.childrenMeta.map((child) => (
                <a
                  className="sidebar-tree-child"
                  data-nav={`/editor/${child.key}`}
                  href={`/editor/${child.key}`}
                  key={child.key}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/editor/${encodeURIComponent(child.key)}`);
                  }}
                >
                  {child.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="sidebar-tree-group">
        <a
          className="sidebar-tree-parent"
          data-nav="/blog"
          href="/blog"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/blog");
          }}
        >
          <span dangerouslySetInnerHTML={iconHtml(icons, "layers")}></span>
          <span>Publicaciones</span>
        </a>
      </div>
    </>
  );
}
