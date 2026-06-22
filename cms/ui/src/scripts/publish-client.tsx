import React from "react";
import { createRoot, type Root } from "react-dom/client";
import PublishView from "../components/PublishView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

type Payload = {
  status: SafeAny;
  changes: SafeAny;
  schedule: SafeAny;
  icons: Record<string, string>;
  onPublish: () => void;
  onSchedule: (runAtLocal: string) => void;
  onCancelSchedule: (id: number) => void;
  onRefresh: () => void;
};

const roots = new WeakMap<Element, Root>();

function mount(target: Element, payload: Payload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<PublishView {...payload} />);
}

export function registerPublishRenderer() {
  window.CMSPublish = { mount };
}
