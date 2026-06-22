import React from "react";
import { createRoot, type Root } from "react-dom/client";
import BlogListView from "../components/BlogListView";
import BlogEditorView from "../components/BlogEditorView";

type BlogPost = {
  slug: string;
  frontmatter?: {
    title?: string;
    date?: string;
    author?: string;
  };
};

type Payload = {
  posts: BlogPost[];
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
    ctaEnabled?: boolean;
    ctaLabel?: string;
    ctaHref?: string;
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
      ctaEnabled?: boolean;
      ctaLabel?: string;
      ctaHref?: string;
    };
    body: string;
  }) => Promise<void>;
};

const roots = new WeakMap<Element, Root>();
let activeBlogRoot: Root | null = null;



function mountList(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<BlogListView {...payload} />);
  activeBlogRoot = root;
}

function mountEditor(target: Element, payload: EditorPayload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<BlogEditorView {...payload} />);
  activeBlogRoot = root;
}

function unmount() {
  if (activeBlogRoot) {
    activeBlogRoot.unmount();
    activeBlogRoot = null;
  }
}

export function registerBlogRenderer() {
  window.CMSBlog = { mountList, mountEditor, unmount };
}
