// ── Drag-and-drop reordering — extracted from editor.js ──
// Provides DnD via HTML5 Drag API with callback-based integration.

import { getNestedValue, setNestedValue } from "./path-helpers";

// ── Types ────────────────────────────────────────────────

type DragState = {
  arrayPath: string;
  fromIdx: number;
  container: HTMLElement;
};

export type DndCallbacks = {
  /** Collect current form values into the data model before a move. */
  collectFormData: () => void;
  /** Get the root data object. */
  getCurrentData: () => unknown;
  /** Re-number structured arrays (e.g. itemsGrid number fields). */
  normalizeStructuredArrays: () => void;
  /** Mark the editor as dirty. */
  setDirty: () => void;
  /** Full re-render of the editor form. */
  rerenderEditorForm: () => void;
  /** Whether the React-based editor is currently active. */
  isReactEditorActive: () => boolean;
};

// ── Module state ─────────────────────────────────────────

let _dragState: DragState | null = null;
const _boundContainers = new WeakSet<HTMLElement>();

// ── Public API ───────────────────────────────────────────

/**
 * Attach drag events to a single array item via its handle.
 * Also ensures the parent container's DnD listeners are bound once.
 */
export function attachDragEvents(
  item: HTMLElement,
  container: HTMLElement,
  arrayPath: string,
  callbacks: DndCallbacks,
): void {
  bindContainerDnd(container, arrayPath, callbacks);
  const handle = item.querySelector(".drag-handle") as HTMLElement | null;
  if (handle) {
    handle.addEventListener("mousedown", () => {
      item.setAttribute("draggable", "true");
    });
    handle.addEventListener("mouseup", () => {
      item.setAttribute("draggable", "false");
    });
  }
}

/**
 * Bind container-level dragover / drop listeners (once per container).
 */
export function bindContainerDnd(
  container: HTMLElement,
  arrayPath: string,
  callbacks: DndCallbacks,
): void {
  if (_boundContainers.has(container)) return;
  _boundContainers.add(container);

  container.addEventListener("dragstart", (e: DragEvent) => {
    const item = (e.target as HTMLElement).closest(".array-item") as HTMLElement | null;
    if (!item) return;
    _dragState = {
      arrayPath,
      fromIdx: parseInt(item.getAttribute("data-dnd-idx") || "0", 10),
      container,
    };
    item.classList.add("dragging");
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", "");
  });

  container.addEventListener("dragend", (e: DragEvent) => {
    const item = (e.target as HTMLElement).closest(".array-item") as HTMLElement | null;
    if (item) {
      item.classList.remove("dragging");
      item.setAttribute("draggable", "false");
    }
    container.querySelectorAll(".array-item").forEach((el) => {
      el.classList.remove("drag-over-above", "drag-over-below");
    });
    _dragState = null;
  });

  container.addEventListener("dragover", (e: DragEvent) => {
    if (!_dragState || _dragState.arrayPath !== arrayPath) return;
    const item = (e.target as HTMLElement).closest(".array-item") as HTMLElement | null;
    if (!item) return;

    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";

    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;

    container.querySelectorAll(".array-item").forEach((el) => {
      el.classList.remove("drag-over-above", "drag-over-below");
    });
    item.classList.add(isAbove ? "drag-over-above" : "drag-over-below");
  });

  container.addEventListener("drop", (e: DragEvent) => {
    if (!_dragState || _dragState.arrayPath !== arrayPath) return;
    const item = (e.target as HTMLElement).closest(".array-item") as HTMLElement | null;
    if (!item) return;

    e.preventDefault();
    const fromIdx = _dragState.fromIdx;
    const toIdx = parseInt(item.getAttribute("data-dnd-idx") || "0", 10);

    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;

    let targetIdx = isAbove ? toIdx : toIdx + 1;
    if (fromIdx < targetIdx) targetIdx--;

    if (fromIdx !== targetIdx) {
      moveArrayItem(arrayPath, fromIdx, targetIdx, callbacks);
    }

    container.querySelectorAll(".array-item").forEach((el) => {
      el.classList.remove("drag-over-above", "drag-over-below");
    });
    _dragState = null;
  });
}

/**
 * Move an item within an array from `fromIdx` to `toIdx` and re-render.
 */
export function moveArrayItem(
  path: string,
  fromIdx: number,
  toIdx: number,
  callbacks: DndCallbacks,
): void {
  if (!callbacks.isReactEditorActive()) {
    callbacks.collectFormData();
  }
  const data = callbacks.getCurrentData();
  const arr = getNestedValue(data, path) as unknown[];
  if (!Array.isArray(arr) || fromIdx === toIdx) return;
  if (fromIdx < 0 || fromIdx >= arr.length) return;
  if (toIdx < 0 || toIdx >= arr.length) return;

  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  setNestedValue(data, path, arr);
  callbacks.normalizeStructuredArrays();
  callbacks.setDirty();
  callbacks.rerenderEditorForm();
}

/**
 * Reset module state (useful for testing or hard resets).
 */
export function resetDndState(): void {
  _dragState = null;
}
