import React from "react";
import { createRoot, type Root } from "react-dom/client";
import SidebarContentTreeView from "../components/SidebarContentTreeView";

type Payload = {
  nodes: Array<{
    parent: string;
    children: string[];
    parentLabel: string;
    parentIcon: string;
    childrenMeta: Array<{ key: string; label: string }>;
  }>;
  icons: Record<string, string>;
  onNavigate: (path: string) => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSSidebar?: {
      mountTree: (target: Element, payload: Payload) => void;
    };
  }
}

function mountTree(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<SidebarContentTreeView {...payload} />);
}

export function registerSidebarRenderer() {
  window.CMSSidebar = { mountTree };
}
