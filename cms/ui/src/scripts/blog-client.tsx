import React from "react";
import { createRoot, type Root } from "react-dom/client";
import BlogListView from "../components/BlogListView";

type Payload = {
  posts: any[];
  icons: Record<string, string>;
  onNew: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSBlog?: {
      mountList: (target: Element, payload: Payload) => void;
    };
  }
}

function mountList(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<BlogListView {...payload} />);
}

export function registerBlogRenderer() {
  window.CMSBlog = { mountList };
}
