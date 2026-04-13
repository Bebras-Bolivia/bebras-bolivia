import React from "react";
import { createRoot } from "react-dom/client";

type PickerOption = {
  value: string;
  label: string;
  description?: string;
};

type PickerPayload = {
  title: string;
  subtitle?: string;
  options: PickerOption[];
};

declare global {
  interface Window {
    CMSModal?: {
      openPicker: (payload: PickerPayload) => Promise<string | null>;
    };
  }
}

function PickerModal({
  payload,
  onClose,
}: {
  payload: PickerPayload;
  onClose: (value: string | null) => void;
}) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(null);
    };
    document.addEventListener("keydown", onEsc);
    document.body.classList.add("editor-modal-open");
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.classList.remove("editor-modal-open");
    };
  }, [onClose]);

  return (
    <div className="editor-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="editor-modal">
        <div className="editor-modal-header">
          <h3>{payload.title}</h3>
          <button type="button" className="editor-modal-close" aria-label="Cerrar" onClick={() => onClose(null)}>
            x
          </button>
        </div>
        {payload.subtitle ? <p className="editor-modal-subtitle">{payload.subtitle}</p> : null}
        <div className="editor-modal-list">
          {payload.options.map((opt) => (
            <button type="button" className="editor-modal-option" key={opt.value} onClick={() => onClose(opt.value)}>
              <span className="title">{opt.label}</span>
              <span className="desc">{opt.description || ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

async function openPicker(payload: PickerPayload): Promise<string | null> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);

  return new Promise((resolve) => {
    const done = (value: string | null) => {
      root.unmount();
      mount.remove();
      resolve(value);
    };
    root.render(<PickerModal payload={payload} onClose={done} />);
  });
}

export function registerModalRenderer() {
  window.CMSModal = { openPicker };
}
