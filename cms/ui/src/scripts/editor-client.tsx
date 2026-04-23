import React from "react";
import { createRoot, type Root } from "react-dom/client";
import ArrayActionsView from "../components/ArrayActionsView";
import ArrayItemActionsView from "../components/ArrayItemActionsView";
import ArrayCollapseToggleView from "../components/ArrayCollapseToggleView";
import ComplexNodesView, { type ComplexNode } from "../components/ComplexNodesView";

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
  getArrayCollapseTargets?: () => Array<{ id: string; expanded: boolean }>;
  onToggleArrayCollapse?: (id: string) => void;
  complexNodes?: ComplexNode[];
  onArrayMount?: (path: string, el: HTMLElement) => void;
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSEditor?: {
      mountPrimitives: (target: Element, payload: PrimitivesPayload) => void;
    };
  }
}

// ── Individual field component with local state ──────────
function FieldInput({
  field,
  onFieldChange,
}: {
  field: PrimitivesPayload["fields"][number];
  onFieldChange: PrimitivesPayload["onFieldChange"];
}) {
  const [value, setValue] = React.useState(field.value);

  // Sync from props when the field identity changes (e.g. after re-render)
  React.useEffect(() => {
    setValue(field.value);
  }, [field.path, field.value]);

  if (field.type === "textarea") {
    return (
      <textarea
        id={`field-${field.path}`}
        className="form-textarea"
        rows={3}
        value={String(value ?? "")}
        onChange={(e) => {
          setValue(e.target.value);
          onFieldChange(field.path, e.target.value);
        }}
      ></textarea>
    );
  }

  if (field.type === "boolean") {
    return (
      <input
        id={`field-${field.path}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => {
          setValue(e.target.checked);
          onFieldChange(field.path, e.target.checked);
        }}
        style={{ width: "16px", height: "16px" }}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={`field-${field.path}`}
        className="form-select"
        value={String(value ?? "")}
        onChange={(e) => {
          setValue(e.target.value);
          onFieldChange(field.path, e.target.value);
        }}
      >
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // text | number | url
  return (
    <input
      id={`field-${field.path}`}
      className="form-input"
      type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
      readOnly={Boolean(field.readOnly)}
      disabled={Boolean(field.readOnly)}
      value={String(value ?? "")}
      onChange={(e) => {
        if (field.type === "number") {
          const n = Number(e.target.value);
          const parsed = Number.isNaN(n) ? 0 : n;
          setValue(parsed);
          onFieldChange(field.path, parsed);
        } else {
          setValue(e.target.value);
          onFieldChange(field.path, e.target.value);
        }
      }}
    />
  );
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
  getArrayCollapseTargets,
  onToggleArrayCollapse,
  complexNodes = [],
  onArrayMount,
}: PrimitivesPayload) {
  const complexRef = React.useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = React.useState(false);

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

    if (complexRef.current && onArrayMount) {
      complexNodes.forEach((node) => {
        if (node.kind !== "array") return;
        const slot = complexRef.current?.querySelector(`[data-complex-array-path="${node.path}"]`);
        if (!slot) return;
        onArrayMount(node.path, slot as HTMLElement);
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

    if (complexRef.current && onToggleArrayCollapse && getArrayCollapseTargets) {
      const targets = getArrayCollapseTargets();
      targets.forEach((target) => {
        const slot = complexRef.current?.querySelector(`[data-array-collapse-placeholder="${target.id}"]`);
        if (!slot) return;
        let root = roots.get(slot);
        if (!root) {
          root = createRoot(slot);
          roots.set(slot, root);
        }
        root.render(
          <ArrayCollapseToggleView
            arrowIcon={icons.arrow || ""}
            expanded={target.expanded}
            onToggle={() => onToggleArrayCollapse(target.id)}
          />
        );
      });
    }
  }, [
    onInitPreview,
    onInitComplex,
    onAddArrayItem,
    getArrayActionTargets,
    onRemoveArrayItem,
    getArrayItemActionTargets,
    onToggleArrayCollapse,
    getArrayCollapseTargets,
    complexNodes,
    onArrayMount,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

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
          <button
            className="btn btn-primary btn-sm"
            id="editor-save"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <><div className="spinner" style={{ width: 14, height: 14, display: "inline-block" }}></div> Guardando...</>
            ) : (
              <><span dangerouslySetInnerHTML={{ __html: icons.save || "" }}></span> Guardar</>
            )}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-form" id="editor-form">
          {fields.map((field) => (
            <div className="form-group" key={field.path}>
              <label htmlFor={`field-${field.path}`}>{field.label}</label>
              <FieldInput field={field} onFieldChange={onFieldChange} />
            </div>
          ))}
          <div ref={complexRef}>
            {complexNodes.length > 0 ? (
              <ComplexNodesView nodes={complexNodes} />
            ) : null}
          </div>
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
