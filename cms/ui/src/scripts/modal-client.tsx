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

type PreviewItem = {
  title: string;
  description: string;
  chips?: string[];
  tone?: "blue" | "red" | "green" | "yellow" | "gray";
  kind: "text" | "institution" | "grid" | "links" | "list" | "stats" | "faq" | "tabs" | "form" | "blog" | "contact" | "cta";
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
  const hasPreview = payload.title.toLowerCase().includes("componente");
  const [selectedValue, setSelectedValue] = React.useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse), (max-width: 760px)").matches) return "";
    return payload.options[0]?.value || "";
  });
  const selectedOption = payload.options.find((opt) => opt.value === selectedValue);

  function isTouchLikeViewport() {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse), (max-width: 760px)").matches;
  }

  function selectOption(value: string) {
    setSelectedValue((current) => isTouchLikeViewport() && current === value ? "" : value);
  }

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

  if (!hasPreview) {
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

  return (
    <div className="editor-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="editor-modal editor-component-picker-modal">
        <div className="editor-modal-header">
          <h3>{payload.title}</h3>
          <button type="button" className="editor-modal-close" aria-label="Cerrar" onClick={() => onClose(null)}>
            x
          </button>
        </div>
        {payload.subtitle ? <p className="editor-modal-subtitle">{payload.subtitle}</p> : null}
        <div className="editor-component-picker-layout">
          <div className="editor-modal-list editor-component-option-list" role="listbox" aria-label="Componentes disponibles">
            {payload.options.map((opt) => {
              const selected = opt.value === selectedOption?.value;
              return (
                <div className="editor-component-option-wrap" key={opt.value}>
                  <button
                    type="button"
                    className={`editor-modal-option editor-component-option${selected ? " is-selected" : ""}`}
                    aria-selected={selected}
                    onMouseEnter={() => { if (!isTouchLikeViewport()) setSelectedValue(opt.value); }}
                    onFocus={() => { if (!isTouchLikeViewport()) setSelectedValue(opt.value); }}
                    onClick={() => selectOption(opt.value)}
                    onDoubleClick={() => onClose(opt.value)}
                  >
                    <span className="title">{opt.label}</span>
                    <span className="desc">{opt.description || ""}</span>
                  </button>
                  {selected ? (
                    <div className="editor-component-mobile-preview">
                      <ComponentPreview option={opt} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <aside className="editor-component-preview-panel" aria-live="polite">
            {selectedOption ? <ComponentPreview option={selectedOption} /> : payload.options[0] ? <ComponentPreview option={payload.options[0]} /> : null}
          </aside>
        </div>
        <div className="editor-component-picker-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(null)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!selectedOption} onClick={() => selectedOption && onClose(selectedOption.value)}>
            Insertar componente
          </button>
        </div>
      </div>
    </div>
  );
}

function getPreviewItem(value: string, fallback: PickerOption): PreviewItem {
  const previews: Record<string, PreviewItem> = {
    sectionRichText: {
      title: "Texto editorial",
      description: "Bloque para explicar una idea con titulo, parrafos, consejo y enlace opcional.",
      chips: ["Titulo", "Parrafos", "Enlace"],
      tone: "blue",
      kind: "text",
    },
    organizerInstitution: {
      title: "Institucion destacada",
      description: "Tarjeta institucional con logo, rol, descripcion y enlace externo.",
      chips: ["Logo", "Rol", "URL"],
      tone: "green",
      kind: "institution",
    },
    itemsGridIcon: {
      title: "Tarjetas con iconos",
      description: "Cuadricula para requisitos, beneficios o pasos con iconos y enlaces por tarjeta.",
      chips: ["Iconos", "Tarjetas", "Links"],
      tone: "red",
      kind: "grid",
    },
    itemsGridImage: {
      title: "Tarjetas con imagen",
      description: "Cuadricula visual para logos, aliados o recursos con imagen.",
      chips: ["Imagen", "Tarjetas", "Links"],
      tone: "yellow",
      kind: "grid",
    },
    itemsGridNumber: {
      title: "Pasos numerados",
      description: "Secuencia ordenada de pasos, proceso o instrucciones.",
      chips: ["1, 2, 3", "Proceso", "Automatico"],
      tone: "blue",
      kind: "grid",
    },
    itemsGridSimple: {
      title: "Tarjetas simples",
      description: "Bloque flexible sin imagen ni icono para contenido corto.",
      chips: ["Simple", "Flexible", "Texto"],
      tone: "gray",
      kind: "grid",
    },
    linksList: {
      title: "Lista de enlaces",
      description: "Recursos externos o internos con descripcion por enlace.",
      chips: ["URL", "Recursos"],
      tone: "blue",
      kind: "links",
    },
    featureList: {
      title: "Lista de caracteristicas",
      description: "Lista editorial para explicar habilidades, beneficios o puntos clave.",
      chips: ["Items", "Intro", "Cierre"],
      tone: "green",
      kind: "list",
    },
    statsGrid: {
      title: "Metricas destacadas",
      description: "Numeros grandes en tarjetas con texto explicativo debajo.",
      chips: ["Numeros", "Columnas"],
      tone: "yellow",
      kind: "stats",
    },
    studentsAgeCategories: {
      title: "Categorias de edad",
      description: "Bloque completo con niveles, edades, emoji y descripcion.",
      chips: ["Niveles", "Edades"],
      tone: "red",
      kind: "grid",
    },
    studentsScoringTable: {
      title: "Tabla de puntuacion",
      description: "Tabla editable para puntajes y resumen numerico.",
      chips: ["Tabla", "Resumen"],
      tone: "blue",
      kind: "stats",
    },
    faqAccordion: {
      title: "Preguntas frecuentes",
      description: "Categorias con preguntas y respuestas desplegables.",
      chips: ["Preguntas", "Categorias"],
      tone: "green",
      kind: "faq",
    },
    tabsGuide: {
      title: "Guia por pestanas",
      description: "Contenido dividido por etapas con puntos internos.",
      chips: ["Tabs", "Pasos"],
      tone: "blue",
      kind: "tabs",
    },
    formContact: {
      title: "Formulario",
      description: "Campos de contacto editables para una vista previa de formulario.",
      chips: ["Campos", "Boton"],
      tone: "gray",
      kind: "form",
    },
    blogIndex: {
      title: "Listado del blog",
      description: "Textos para el estado vacio y boton de leer mas.",
      chips: ["Noticias", "Leer mas"],
      tone: "yellow",
      kind: "blog",
    },
    blogPostUi: {
      title: "Detalle del blog",
      description: "Textos de navegacion y llamado a la accion para posts.",
      chips: ["Volver", "CTA"],
      tone: "blue",
      kind: "blog",
    },
    contactClassic: {
      title: "Contacto completo",
      description: "Informacion, enlaces internacionales y formulario en dos columnas.",
      chips: ["Info", "Formulario"],
      tone: "green",
      kind: "contact",
    },
    cta: {
      title: "Llamado a la accion",
      description: "Bloque destacado con titulo, texto y boton principal.",
      chips: ["Boton", "Destacado"],
      tone: "red",
      kind: "cta",
    },
  };

  return previews[value] || {
    title: fallback.label,
    description: fallback.description || "Vista previa del componente seleccionado.",
    chips: [],
    tone: "blue",
    kind: "text",
  };
}

function ComponentPreview({ option }: { option: PickerOption }) {
  const preview = getPreviewItem(option.value, option);
  return (
    <div className={`component-preview-card tone-${preview.tone || "blue"}`}>
      <div className="component-preview-topline">
        <span>Vista previa</span>
        <span>{option.label}</span>
      </div>
      <RealComponentPreview option={option} preview={preview} />
      <div className="component-preview-copy">
        <h4>{preview.title}</h4>
        <p>{preview.description}</p>
        {preview.chips && preview.chips.length > 0 ? (
          <div className="component-preview-chips">
            {preview.chips.map((chip) => <span key={chip}>{chip}</span>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RealComponentPreview({ option, preview }: { option: PickerOption; preview: PreviewItem }) {
  if (option.value === "organizerInstitution") {
    return (
      <div className="real-preview real-institution">
        <div className="real-logo">OBI</div>
        <div><p className="real-kicker">Institucion organizadora</p><h5>Olimpiada Boliviana de Informatica</h5><p>Coordina el desafio y articula iniciativas educativas en Bolivia.</p><a>obi.org.bo</a></div>
      </div>
    );
  }

  if (option.value.startsWith("itemsGrid")) {
    const isSimpleGrid = option.value === "itemsGridSimple";
    const media = option.value === "itemsGridNumber" ? ["1", "2", "3"] : option.value === "itemsGridImage" ? ["IMG", "IMG", "IMG"] : isSimpleGrid ? ["", "", ""] : ["⌘", "◌", "↗"];
    return (
      <div className="real-preview real-section-preview">
        <p className="real-kicker">Tarjetas</p><h5>{preview.title}</h5><p className="real-intro">Texto introductorio opcional para contextualizar el bloque.</p>
        <div className={`real-card-grid${isSimpleGrid ? " real-card-grid-simple" : ""}`}>
          {media.map((m, index) => <article key={index}>{!isSimpleGrid ? <span>{m}</span> : null}<strong>{isSimpleGrid ? `Tarjeta ${index + 1}` : index === 0 ? "Registro" : index === 1 ? "Recursos" : "Seguimiento"}</strong><p>Descripcion breve de la tarjeta.</p></article>)}
        </div>
      </div>
    );
  }

  if (option.value === "sectionRichText") {
    return <div className="real-preview real-rich-text"><p className="real-kicker">Seccion</p><h5>Titulo de seccion</h5><p>Bebras promueve el pensamiento computacional mediante problemas logicos y accesibles.</p><blockquote>Consejo opcional para destacar informacion importante.</blockquote><a>Ver mas</a></div>;
  }

  if (option.value === "linksList") {
    return <div className="real-preview real-links"><p className="real-kicker">Recursos</p><h5>Enlaces utiles</h5>{["Bebras Internacional", "Problemas de practica", "Guia para docentes"].map((label) => <a key={label}>{label}<span>→</span></a>)}</div>;
  }

  if (option.value === "featureList") {
    return <div className="real-preview real-features"><p className="real-kicker">Habilidades</p><h5>Pensamiento computacional</h5>{["Descomposicion", "Patrones", "Algoritmos"].map((label, index) => <article key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><p>Descripcion breve del punto.</p></article>)}</div>;
  }

  if (option.value === "statsGrid" || option.value === "studentsScoringTable") {
    return <div className="real-preview real-stats"><p className="real-kicker">Formato</p><h5>{preview.title}</h5><div><article><strong>15</strong><span>Preguntas</span></article><article><strong>45</strong><span>Minutos</span></article><article><strong>180</strong><span>Puntaje maximo</span></article></div></div>;
  }

  if (option.value === "faqAccordion") {
    return <div className="real-preview real-faq"><p className="real-kicker">Ayuda</p><h5>Preguntas frecuentes</h5><details open><summary>¿Que es Bebras?</summary><p>Una iniciativa internacional de pensamiento computacional.</p></details><details><summary>¿Es gratuito?</summary></details></div>;
  }

  if (option.value === "tabsGuide") {
    return <div className="real-preview real-tabs"><p className="real-kicker">Guia</p><h5>Instrucciones</h5><div className="real-tab-list"><span>Antes</span><span>Durante</span><span>Despues</span></div><article><strong>Preparar estudiantes</strong><p>Comparte ejemplos y verifica equipos.</p></article></div>;
  }

  if (option.value === "formContact") {
    return <div className="real-preview real-form"><p className="real-kicker">Formulario</p><h5>Envianos un mensaje</h5><label>Nombre</label><span></span><label>Correo</label><span></span><button>Enviar mensaje</button></div>;
  }

  if (option.value === "contactClassic") {
    return <div className="real-preview real-contact"><section><p className="real-kicker">Informacion</p><h5>Contacto</h5><article>Email<br /><strong>info@bebras.bo</strong></article><article>Registro<br /><strong>/registro</strong></article></section><section><p className="real-kicker">Formulario</p><span></span><span></span><button>Enviar</button></section></div>;
  }

  if (option.value === "blogIndex" || option.value === "blogPostUi") {
    return <div className="real-preview real-blog"><p className="real-kicker">Noticias</p><article><time>Nov 2026</time><h5>Nueva publicacion</h5><p>Resumen de la noticia o recurso publicado.</p><a>Leer mas →</a></article></div>;
  }

  if (option.value === "cta") {
    return <div className="real-preview real-cta"><p className="real-kicker">Colabora</p><h5>¿Listo para participar?</h5><p>Un llamado destacado con texto corto y boton principal.</p><button>Ir a registro</button></div>;
  }

  if (option.value === "studentsAgeCategories") {
    return <div className="real-preview real-age"><p className="real-kicker">Niveles</p><h5>Categorias por edad</h5><div>{["🦜", "🦫", "🐒", "🐻"].map((emoji) => <article key={emoji}>{emoji}<strong>Categoria</strong><span>8-10 anos</span></article>)}</div></div>;
  }

  return <div className="real-preview real-rich-text"><p className="real-kicker">Preview</p><h5>{preview.title}</h5><p>{preview.description}</p></div>;
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
