import React from "react";
import { createRoot, type Root } from "react-dom/client";
import ComplexNodesView, { type ComplexNode } from "../components/ComplexNodesView";
import BrandColorSwatch from "../components/BrandColorSwatch";

type PrimitivesPayload = {
  title: string;
  filename: string;
  fields: Array<{
    path: string;
    label: string;
    type: "text" | "textarea" | "number" | "boolean" | "url" | "select" | "brand-color";
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
  onAddArrayItem?: (path: string, selectedType: string | null, componentPicker?: boolean) => void;
  onRemoveArrayItem?: (path: string, idx: number) => void;
  onToggleArrayCollapse?: (itemPath: string, expanded: boolean) => void;
  onMoveArrayItem?: (path: string, fromIdx: number, toIdx: number) => void;
  complexNodes?: ComplexNode[];
};

const roots = new WeakMap<Element, Root>();

declare global {
  interface Window {
    CMSEditor?: {
      mountPrimitives: (target: Element, payload: PrimitivesPayload) => void;
    };
  }
}

// Controlled directly from props — no local state mirror.
function FieldInput({
  field,
  onFieldChange,
}: {
  field: PrimitivesPayload["fields"][number];
  onFieldChange: PrimitivesPayload["onFieldChange"];
}) {
  const value = field.value;

  if (field.type === "textarea") {
    return (
      <textarea
        id={`field-${field.path}`}
        className="form-textarea"
        rows={3}
        value={String(value ?? "")}
        onChange={(e) => onFieldChange(field.path, e.target.value)}
      ></textarea>
    );
  }

  if (field.type === "boolean") {
    return (
      <input
        id={`field-${field.path}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onFieldChange(field.path, e.target.checked)}
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
        onChange={(e) => onFieldChange(field.path, e.target.value)}
      >
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "brand-color") {
    return (
      <BrandColorSwatch
        id={`field-${field.path}`}
        value={value}
        onChange={(next) => onFieldChange(field.path, next)}
      />
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
          onFieldChange(field.path, Number.isNaN(n) ? 0 : n);
        } else {
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
  onAddArrayItem,
  onRemoveArrayItem,
  onToggleArrayCollapse,
  onMoveArrayItem,
  complexNodes = [],
}: PrimitivesPayload) {
  const complexRef = React.useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = React.useState(false);
  const displayFilename = filename === "docentes.json" ? "maestros.json" : filename;

  React.useEffect(() => {
    onInitPreview();
    if (complexRef.current) {
      onInitComplex(complexRef.current);
    }
  }, [onInitPreview, onInitComplex]);

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
          <span className="text-sm text-muted">{displayFilename}</span>
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
              <ComplexNodesView
                nodes={complexNodes}
                icons={icons}
                onFieldChange={onFieldChange}
                onAddArrayItem={onAddArrayItem || (() => {})}
                onRemoveArrayItem={onRemoveArrayItem || (() => {})}
                onToggleArrayCollapse={onToggleArrayCollapse || (() => {})}
                onMoveArrayItem={onMoveArrayItem || (() => {})}
              />
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
