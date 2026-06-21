import React from "react";
import { createRoot, type Root } from "react-dom/client";
import DashboardView from "../components/DashboardView";

type PublishData = {
  isPublishing?: boolean;
  isBuilding?: boolean;
  lastPublish?: {
    finished_at?: string;
    date?: string;
  } | null;
};

type MountPayload = {
  files: string[];
  posts: unknown[];
  snapshots: unknown[];
  publishData: PublishData;
  contentTree: { parent: string; children: string[] }[];
  contentMeta: Record<string, { label?: string; desc?: string }>;
  icons: Record<string, string>;
  onNavigate: (path: string) => void;
  onPublish: () => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSDashboard?: {
      mount: (target: Element, payload: MountPayload) => void;
    };
  }
}

function mount(target: Element, payload: MountPayload): void {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<DashboardView {...payload} />);
}

export function registerDashboardRenderer(): void {
  window.CMSDashboard = { mount };
}
