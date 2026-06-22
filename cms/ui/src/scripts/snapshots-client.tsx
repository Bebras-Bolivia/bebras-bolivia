import React from "react";
import { createRoot, type Root } from "react-dom/client";
import SnapshotsView from "../components/SnapshotsView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

type Payload = {
  snapshots: SafeAny[];
  icons: Record<string, string>;
  onCreate: () => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
};

const roots = new WeakMap<Element, Root>();
let activeSnapshotsRoot: Root | null = null;

function mountList(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<SnapshotsView {...payload} />);
  activeSnapshotsRoot = root;
}

function unmount() {
  if (activeSnapshotsRoot) {
    activeSnapshotsRoot.unmount();
    activeSnapshotsRoot = null;
  }
}

export function registerSnapshotsRenderer() {
  window.CMSSnapshots = { mountList, unmount };
}
