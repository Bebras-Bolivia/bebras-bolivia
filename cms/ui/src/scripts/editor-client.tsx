import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { createPortal } from "react-dom";
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
// Track the live editor root so we can unmount it (and its header-portalled
// buttons) cleanly when leaving the editor, instead of poking the DOM by hand.
let activeEditorRoot: Root | null = null;

const selectOptionLabels: Record<string, string> = {
  button: "Boton",
  link: "Enlace",
  primary: "Principal",
  secondary: "Secundario",
  positive: "Positivo",
  neutral: "Neutral",
  negative: "Negativo",
  monitor: "Computadora",
  wifi: "Internet",
  user: "Usuario",
  clock: "Reloj",
  email: "Correo",
  clipboard: "Portapapeles",
  share: "Compartir",
  school: "Escuela",
  brain: "Pensamiento",
  icon: "Icono",
  image: "Imagen",
  number: "Numero",
  none: "Ninguno",
  guacamayo: "Guacamayo",
  capibara: "Capibara",
  titi: "Titi",
  jucumari: "Jucumari",
  yaguarete: "Yaguarete",
};

declare global {
  interface Window {
    CMSEditor?: {
      mountPrimitives: (target: Element, payload: PrimitivesPayload) => void;
      unmountPrimitives: () => void;
    };
  }
}

function FieldInput({
  field,
  onFieldChange,
}: {
  field: PrimitivesPayload["fields"][number];
  onFieldChange: PrimitivesPayload["onFieldChange"];
}) {
  const value = field.value;
  const [draftValue, setDraftValue] = React.useState(String(value ?? ""));

  React.useEffect(() => {
    setDraftValue(String(value ?? ""));
  }, [field.path, value]);

  if (field.type === "textarea") {
    return (
      <textarea
        id={`field-${field.path}`}
        className="form-textarea"
        rows={3}
        value={draftValue}
        onChange={(e) => {
          setDraftValue(e.target.value);
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
            {selectOptionLabels[opt] || opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "brand-color") {
    return (
      <BrandColorSwatch
        id={`field-${field.path}`}
        path={field.path}
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
      value={draftValue}
      onChange={(e) => {
        setDraftValue(e.target.value);
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
  const [headerSlot, setHeaderSlot] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    onInitPreview();
    if (complexRef.current) {
      onInitComplex(complexRef.current);
    }
  }, [onInitPreview, onInitComplex]);

  // The editor's action buttons live in the global header (next to "Publicar")
  // via a portal, so every action sits in one bar. React removes the portalled
  // nodes automatically when this component unmounts.
  React.useEffect(() => {
    setHeaderSlot(document.getElementById("header-editor-actions"));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <button
      className="btn btn-primary btn-sm"
      id="editor-save"
      disabled={saving}
      onClick={handleSave}
      aria-label="Guardar"
    >
      {saving ? (
        <><div className="spinner" style={{ width: 14, height: 14, display: "inline-block" }}></div> <span className="btn-text">Guardando...</span></>
      ) : (
        <><span dangerouslySetInnerHTML={{ __html: icons.save || "" }}></span> <span className="btn-text">Guardar</span></>
      )}
    </button>
  );

  const resetButton = (
    <button className="btn btn-ghost btn-sm" onClick={onReset} aria-label="Actualizar vista previa" title="Recarga la vista previa con tus cambios actuales">
      <span dangerouslySetInnerHTML={{ __html: icons.refresh || "" }}></span> <span className="btn-text">Actualizar vista previa</span>
    </button>
  );

  return (
    <>
      {headerSlot
        ? createPortal(
            <>
              {resetButton}
              {saveButton}
            </>,
            headerSlot
          )
        : null}

      <div className="editor-layout">
        <div className="editor-form" id="editor-form">
          {fields.length > 0 ? (
            <div className="editor-group">
              {fields.map((field) => (
                <div className="form-group" key={field.path}>
                  <label htmlFor={`field-${field.path}`}>{field.label}</label>
                  <FieldInput field={field} onFieldChange={onFieldChange} />
                </div>
              ))}
            </div>
          ) : null}
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
            <span id="preview-overlay-text">Cargando la vista previa de tu página...</span>
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

  activeEditorRoot = root;
  root.render(<EditorPrimitivesView {...payload} />);
}

// Cleanly tear down the editor before the shell replaces #main-content for
// another view. Unmounting the React root also removes the action buttons it
// portalled into the header.
function unmountPrimitives() {
  if (activeEditorRoot) {
    activeEditorRoot.unmount();
    activeEditorRoot = null;
  }
}

export function registerEditorRenderer() {
  window.CMSEditor = { mountPrimitives, unmountPrimitives };
}
