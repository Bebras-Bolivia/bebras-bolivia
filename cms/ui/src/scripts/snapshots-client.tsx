import React from "react";
import { createRoot, type Root } from "react-dom/client";
import SnapshotsView from "../components/SnapshotsView";

type Payload = {
  snapshots: any[];
  icons: Record<string, string>;
  onCreate: () => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSSnapshots?: {
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

  root.render(<SnapshotsView {...payload} />);
}

export function registerSnapshotsRenderer() {
  window.CMSSnapshots = { mountList };
}
