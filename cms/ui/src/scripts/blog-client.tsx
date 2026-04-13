import React from "react";
import { createRoot, type Root } from "react-dom/client";
import BlogListView from "../components/BlogListView";
import BlogEditorView from "../components/BlogEditorView";

type Payload = {
  posts: any[];
  icons: Record<string, string>;
  onNew: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
};

type EditorPayload = {
  isNew: boolean;
  slug: string;
  frontmatter: {
    title: string;
    description: string;
    date: string;
    author: string;
    image?: string;
  };
  body: string;
  icons: Record<string, string>;
  onBack: () => void;
  onSave: (payload: {
    slug: string;
    frontmatter: {
      title: string;
      description: string;
      date: string;
      author: string;
      image?: string;
    };
    body: string;
  }) => Promise<void>;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSBlog?: {
      mountList: (target: Element, payload: Payload) => void;
      mountEditor: (target: Element, payload: EditorPayload) => void;
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

function mountEditor(target: Element, payload: EditorPayload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<BlogEditorView {...payload} />);
}

export function registerBlogRenderer() {
  window.CMSBlog = { mountList, mountEditor };
}
