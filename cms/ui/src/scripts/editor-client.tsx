import React from "react";
import { createRoot, type Root } from "react-dom/client";
import ArrayActionsView from "../components/ArrayActionsView";
import ArrayItemActionsView from "../components/ArrayItemActionsView";

type PrimitivesPayload = {
  title: string;
  filename: string;
  fields: Array<{
    path: string;
    label: string;
    type: "text" | "textarea" | "number" | "boolean" | "url" | "select";
    value: string | number | boolean;
    options?: string[];
    readOnly?: boolean;
  }>;
  icons: Record<string, string>;
  onSave: () => void;
  onReset: () => void;
  onFieldChange: (path: string, value: string | number | boolean) => void;
  onInitPreview: () => void;
  onInitComplex: (el: HTMLElement) => void;
  getArrayActionTargets?: () => Array<{
    id: string;
    options: Array<{ value: string; label: string }>;
    mode?: "select" | "button";
    buttonLabel?: string;
  }>;
  onAddArrayItem?: (id: string, selectedType: string | null) => void;
  getArrayItemActionTargets?: () => Array<{ id: string; inline?: boolean }>;
  onRemoveArrayItem?: (id: string) => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSEditor?: {
      mountPrimitives: (target: Element, payload: PrimitivesPayload) => void;
    };
  }
}

function EditorPrimitivesView({
  title,
  filename,
  fields,
  icons,
  onSave,
  onReset,
  onFieldChange,
  onInitPreview,
  onInitComplex,
  getArrayActionTargets,
  onAddArrayItem,
  getArrayItemActionTargets,
  onRemoveArrayItem,
}: PrimitivesPayload) {
  const complexRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    onInitPreview();
    if (complexRef.current) {
      onInitComplex(complexRef.current);
    }

    if (complexRef.current && onAddArrayItem && getArrayActionTargets) {
      const targets = getArrayActionTargets();
      targets.forEach((target) => {
        const slot = complexRef.current?.querySelector(`[data-array-action-placeholder="${target.id}"]`);
        if (!slot) return;
        let root = roots.get(slot);
        if (!root) {
          root = createRoot(slot);
          roots.set(slot, root);
        }
        root.render(
          <ArrayActionsView
            options={target.options}
            showSelect={target.mode !== "button"}
            buttonLabel={target.buttonLabel}
            onAdd={(selectedType) => {
              onAddArrayItem(target.id, selectedType);
            }}
          />
        );
      });
    }

    if (complexRef.current && onRemoveArrayItem && getArrayItemActionTargets) {
      const targets = getArrayItemActionTargets();
      targets.forEach((target) => {
        const slot = complexRef.current?.querySelector(`[data-array-item-action-placeholder="${target.id}"]`);
        if (!slot) return;
        let root = roots.get(slot);
        if (!root) {
          root = createRoot(slot);
          roots.set(slot, root);
        }
        root.render(
          <ArrayItemActionsView
            trashIcon={icons.trash || ""}
            inline={Boolean(target.inline)}
            onRemove={() => onRemoveArrayItem(target.id)}
          />
        );
      });
    }
  }, [onInitPreview, onInitComplex, onAddArrayItem, getArrayActionTargets]);

  return (
    <>
      <div className="editor-toolbar">
        <div>
          <h2>{title}</h2>
          <span className="text-sm text-muted">{filename}</span>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            <span dangerouslySetInnerHTML={{ __html: icons.refresh || "" }}></span> Resetear
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSave}>
            <span dangerouslySetInnerHTML={{ __html: icons.save || "" }}></span> Guardar
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-form" id="editor-form">
          {fields.map((field) => (
            <div className="form-group" key={field.path}>
              <label htmlFor={`field-${field.path}`}>{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  id={`field-${field.path}`}
                  className="form-textarea"
                  rows={3}
                  value={String(field.value ?? "")}
                  onChange={(e) => onFieldChange(field.path, e.target.value)}
                ></textarea>
              ) : field.type === "boolean" ? (
                <input
                  id={`field-${field.path}`}
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(e) => onFieldChange(field.path, e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
              ) : field.type === "select" ? (
                <select
                  id={`field-${field.path}`}
                  className="form-select"
                  value={String(field.value ?? "")}
                  onChange={(e) => onFieldChange(field.path, e.target.value)}
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.path}`}
                  className="form-input"
                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                  readOnly={Boolean(field.readOnly)}
                  disabled={Boolean(field.readOnly)}
                  value={String(field.value ?? "")}
                  onChange={(e) => {
                    if (field.type === "number") {
                      const n = Number(e.target.value);
                      onFieldChange(field.path, Number.isNaN(n) ? 0 : n);
                    } else {
                      onFieldChange(field.path, e.target.value);
                    }
                  }}
                />
              )}
            </div>
          ))}
          <div ref={complexRef}></div>
        </div>

        <div className="editor-preview" id="editor-preview-panel">
          <div className="preview-overlay" id="preview-overlay" style={{ display: "none" }}>
            <div className="spinner"></div>
            <span id="preview-overlay-text">Iniciando servidor de vista previa...</span>
          </div>
          <iframe id="preview-frame" src="about:blank"></iframe>
        </div>
      </div>
    </>
  );
}

function mountPrimitives(target: Element, payload: PrimitivesPayload) {
  let root = roots.get(target);
  if (!root) {
    root = createRoot(target);
    roots.set(target, root);
  }

  root.render(<EditorPrimitivesView {...payload} />);
}

export function registerEditorRenderer() {
  window.CMSEditor = { mountPrimitives };
}
