import React, { useState } from "react";

type Node = {
  parent: string;
  parentLabel: string;
  parentIcon: string;
  childrenMeta: Array<{ key: string; label: string; path: string }>;
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

function SidebarTreeNode({
  node,
  icons,
  onNavigate,
}: {
  node: Node;
  icons: Record<string, string>;
  onNavigate: (path: string) => void;
}) {
  const currentPath = window.App.appPathname();
  const [open, setOpen] = useState(
    currentPath.startsWith(`/editor/${encodeURIComponent(node.parent)}/`),
  );

  if (node.childrenMeta.length === 0) {
    const path = editorPathFor(node.parent);
    return (
      <a
        className={`sidebar-tree-parent${currentPath === path ? " active" : ""}`}
        data-nav={path}
        href={path}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(path);
        }}
      >
        <span dangerouslySetInnerHTML={iconHtml(icons, node.parentIcon || "edit")}></span>
        <span>{node.parentLabel}</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-tree-parent sidebar-tree-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span dangerouslySetInnerHTML={iconHtml(icons, node.parentIcon || "edit")}></span>
        <span>{node.parentLabel}</span>
        <span className="sidebar-tree-chevron" dangerouslySetInnerHTML={iconHtml(icons, "chevron")}></span>
      </button>
      <div className={`sidebar-tree-collapse${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="sidebar-tree-collapse-content">
          <div className="sidebar-tree-children">
            {node.childrenMeta.map((child) => (
              <a
                className={`sidebar-tree-child${currentPath === child.path ? " active" : ""}`}
                data-nav={child.path}
                href={child.path}
                key={child.key}
                tabIndex={open ? undefined : -1}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(child.path);
                }}
              >
                {child.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function SidebarContentTreeView({ nodes, icons, onNavigate }: Props) {
  return (
    <>
      {nodes.map((node) => (
        <div className="sidebar-tree-group" key={node.parent}>
          <SidebarTreeNode node={node} icons={icons} onNavigate={onNavigate} />
        </div>
      ))}
    </>
  );
}
