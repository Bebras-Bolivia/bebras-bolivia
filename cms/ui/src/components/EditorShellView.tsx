import React, { useEffect, useRef } from "react";

interface Props {
  title: string;
  filename: string;
  icons: Record<string, string>;
  onSave: () => void;
  onReset: () => void;
  onInitForm: (el: HTMLElement) => void;
  onInitPreview: () => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

export default function EditorShellView({ title, filename, icons, onSave, onReset, onInitForm, onInitPreview }: Props) {
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!formRef.current) return;
    onInitForm(formRef.current);
    onInitPreview();
  }, [onInitForm, onInitPreview]);

  return (
    <>
      <div className="editor-toolbar">
        <div>
          <h2>{title}</h2>
          <span className="text-sm text-muted">{filename}</span>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> Resetear
          </button>
          <button className="btn btn-primary btn-sm" id="editor-save" onClick={onSave}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "save")}></span> Guardar
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-form" id="editor-form" ref={formRef}></div>
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
