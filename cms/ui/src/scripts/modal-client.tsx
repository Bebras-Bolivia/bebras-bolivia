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

type ConfirmPayload = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type InputPayload = {
  title: string;
  subtitle?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  confirmLabel?: string;
  cancelLabel?: string;
};



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

function ConfirmModal({ payload, onClose }: { payload: ConfirmPayload; onClose: (value: boolean) => void }) {
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onEsc);
    document.body.classList.add("editor-modal-open");
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.classList.remove("editor-modal-open");
    };
  }, [onClose]);

  return (
    <div className="editor-modal-overlay editor-modal-overlay-center" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="editor-modal editor-confirm-modal">
        <div className="editor-modal-header">
          <h3>{payload.title}</h3>
          <button type="button" className="editor-modal-close" aria-label="Cerrar" onClick={() => onClose(false)}>
            x
          </button>
        </div>
        <p className="editor-modal-subtitle">{payload.message}</p>
        <div className="editor-confirm-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(false)}>
            {payload.cancelLabel || "Cancelar"}
          </button>
          <button type="button" className={`btn ${payload.tone === "danger" ? "btn-danger" : "btn-primary"} btn-sm`} onClick={() => onClose(true)}>
            {payload.confirmLabel || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputModal({ payload, onClose }: { payload: InputPayload; onClose: (value: string | null) => void }) {
  const [value, setValue] = React.useState(payload.defaultValue || "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(null);
    };
    document.addEventListener("keydown", onEsc);
    document.body.classList.add("editor-modal-open");
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.classList.remove("editor-modal-open");
    };
  }, [onClose]);

  return (
    <div className="editor-modal-overlay editor-modal-overlay-center" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="editor-modal editor-input-modal">
        <div className="editor-modal-header">
          <h3>{payload.title}</h3>
          <button type="button" className="editor-modal-close" aria-label="Cerrar" onClick={() => onClose(null)}>
            x
          </button>
        </div>
        {payload.subtitle ? <p className="editor-modal-subtitle">{payload.subtitle}</p> : null}
        <form
          className="editor-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            onClose(value);
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            {payload.label ? <label htmlFor="editor-modal-input">{payload.label}</label> : null}
            <input
              ref={inputRef}
              id="editor-modal-input"
              className="form-input"
              value={value}
              maxLength={payload.maxLength || 120}
              placeholder={payload.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="form-hint">{value.length}/{payload.maxLength || 120}</div>
          </div>
          <div className="editor-confirm-actions editor-input-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(null)}>
              {payload.cancelLabel || "Cancelar"}
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {payload.confirmLabel || "Aceptar"}
            </button>
          </div>
        </form>
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

async function openConfirm(payload: ConfirmPayload): Promise<boolean> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);

  return new Promise((resolve) => {
    const done = (value: boolean) => {
      root.unmount();
      mount.remove();
      resolve(value);
    };
    root.render(<ConfirmModal payload={payload} onClose={done} />);
  });
}

async function openInput(payload: InputPayload): Promise<string | null> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);

  return new Promise((resolve) => {
    const done = (value: string | null) => {
      root.unmount();
      mount.remove();
      resolve(value);
    };
    root.render(<InputModal payload={payload} onClose={done} />);
  });
}

export function registerModalRenderer() {
  window.CMSModal = { openPicker, openConfirm, openInput };
}
