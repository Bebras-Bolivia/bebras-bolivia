import React from "react";
import { createRoot, type Root } from "react-dom/client";
import EditorShellView from "../components/EditorShellView";

type Payload = {
  title: string;
  filename: string;
  icons: Record<string, string>;
  onSave: () => void;
  onReset: () => void;
  onInitForm: (el: HTMLElement) => void;
  onInitPreview: () => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSEditor?: {
      mountShell: (target: Element, payload: Payload) => void;
    };
  }
}

function mountShell(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<EditorShellView {...payload} />);
}

export function registerEditorRenderer() {
  window.CMSEditor = { mountShell };
}
