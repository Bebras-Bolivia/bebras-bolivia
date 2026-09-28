import React from "react";

type Logo = { id: string; src: string; alt: string; height: number };

const MIN_HEIGHT = 2;
const MAX_HEIGHT = 12;
const DEFAULT_HEIGHT = 5.6;

function clampHeight(value: number) {
  return Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, value)) * 10) / 10;
}

function nameFromFile(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 120);
}

function previewSrc(src: string) {
  return src.startsWith("/") ? window.App.appUrl(src) : src;
}

function isImage(file: File) {
  return /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type);
}

export default function CertificateLogosEditor() {
  const [saved, setSaved] = React.useState<Logo[] | null>(null);
  const [logos, setLogos] = React.useState<Logo[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"save" | "upload" | null>(null);
  const paper = React.useRef<HTMLDivElement>(null);
  const logoRefs = React.useRef(new Map<string, HTMLDivElement>());
  const addInput = React.useRef<HTMLInputElement>(null);
  const replaceInput = React.useRef<HTMLInputElement>(null);
  const gesture = React.useRef<
    | { kind: "move"; id: string; startX: number; moved: boolean }
    | { kind: "resize"; id: string; startX: number; startY: number; startHeight: number; aspect: number }
    | null
  >(null);

  React.useEffect(() => {
    window.API.getContent("certificate.json")
      .then((data: { logos?: Logo[] }) => {
        const list = Array.isArray(data?.logos) ? data.logos : [];
        setSaved(list);
        setLogos(list);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(logos);
  const current = logos.find((logo) => logo.id === selected) ?? null;

  const update = (id: string, patch: Partial<Logo>) =>
    setLogos((list) => list.map((logo) => (logo.id === id ? { ...logo, ...patch } : logo)));

  const move = (id: string, to: number) =>
    setLogos((list) => {
      const from = list.findIndex((logo) => logo.id === id);
      const target = Math.max(0, Math.min(list.length - 1, to));
      if (from < 0 || from === target) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      return next;
    });

  const remove = (id: string) => {
    setLogos((list) => list.filter((logo) => logo.id !== id));
    setSelected(null);
  };

  const upload = async (file: File) => {
    if (!isImage(file)) {
      window.Toast.error("Elige una imagen PNG, JPG, WEBP o SVG.");
      return null;
    }
    setBusy("upload");
    try {
      const result = await window.API.uploadMedia(file, "sponsors");
      const url = String(result?.url || "");
      if (!url) throw new Error("No se pudo subir la imagen");
      return url;
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const addLogo = async (file: File) => {
    const src = await upload(file);
    if (!src) return;
    const logo = { id: `logo-${Date.now().toString(36)}`, src, alt: nameFromFile(file), height: DEFAULT_HEIGHT };
    setLogos((list) => [...list, logo]);
    setSelected(logo.id);
  };

  const replaceLogo = async (file: File) => {
    if (!current) return;
    const src = await upload(file);
    if (src) update(current.id, { src });
  };

  const save = async () => {
    setBusy("save");
    try {
      await window.API.saveContent("certificate.json", { logos });
      setSaved(logos);
      window.Toast.success("Logos guardados. El sitio se publicará en unos segundos.");
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudieron guardar los logos");
    } finally {
      setBusy(null);
    }
  };

  const pxPerUnit = () => (paper.current?.clientWidth ?? 1000) / 100;

  const onLogoPointerDown = (event: React.PointerEvent<HTMLDivElement>, logo: Logo) => {
    if (event.button !== 0) return;
    setSelected(logo.id);
    gesture.current = { kind: "move", id: logo.id, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerDown = (event: React.PointerEvent<HTMLSpanElement>, logo: Logo) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    const element = logoRefs.current.get(logo.id);
    const rect = element?.getBoundingClientRect();
    gesture.current = {
      kind: "resize",
      id: logo.id,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: logo.height,
      aspect: rect && rect.height ? rect.width / rect.height : 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const active = gesture.current;
    if (!active) return;
    if (active.kind === "resize") {
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      const delta = (dx / active.aspect + dy) / 2 / pxPerUnit();
      update(active.id, { height: clampHeight(active.startHeight + delta) });
      return;
    }
    if (!active.moved && Math.abs(event.clientX - active.startX) < 5) return;
    active.moved = true;
    const others = logos.filter((logo) => logo.id !== active.id);
    const target = others.filter((logo) => {
      const rect = logoRefs.current.get(logo.id)?.getBoundingClientRect();
      return rect ? rect.left + rect.width / 2 < event.clientX : false;
    }).length;
    move(active.id, target);
  };

  const onPointerUp = () => {
    gesture.current = null;
  };

  const onLogoKeyDown = (event: React.KeyboardEvent, logo: Logo, index: number) => {
    if (event.key === "ArrowLeft") move(logo.id, index - 1);
    else if (event.key === "ArrowRight") move(logo.id, index + 1);
    else if (event.key === "+" || event.key === "=") update(logo.id, { height: clampHeight(logo.height + 0.2) });
    else if (event.key === "-") update(logo.id, { height: clampHeight(logo.height - 0.2) });
    else if (event.key === "Delete" || event.key === "Backspace") remove(logo.id);
    else return;
    event.preventDefault();
  };

  if (loadError) {
    return <p className="text-muted">No se pudieron cargar los logos: {loadError}</p>;
  }

  if (!saved) {
    return (
      <div className="loading-state">
        <div className="spinner"></div> Cargando...
      </div>
    );
  }

  return (
    <div>
      <div style={{ containerType: "inline-size", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div
          ref={paper}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
          style={{ position: "relative", height: "29cqi", background: "#FDFCFB", color: "#2B211C" }}
        >
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: "1.3cqi", background: "linear-gradient(90deg,#E83B3B 0 33.3%,#F8AE31 33.3% 66.6%,#1B8F60 66.6%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "3cqi", left: "3cqi", right: "3cqi", bottom: "-5cqi", border: "0.35cqi solid #F8AE31", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "3.9cqi", left: "3.9cqi", right: "3.9cqi", bottom: "-5cqi", border: "0.12cqi solid rgba(50,76,135,0.6)", pointerEvents: "none" }} />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "7.5cqi",
              right: "14.5cqi",
              width: "15cqi",
              height: "19.5cqi",
              border: "1px dashed rgba(43,33,28,0.25)",
              borderRadius: "50% 50% 0.5cqi 0.5cqi",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2cqi",
              color: "rgba(43,33,28,0.4)",
              pointerEvents: "none",
            }}
          >
            Sello
          </div>
          <div
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "absolute",
              top: "8.8cqi",
              left: "9cqi",
              display: "flex",
              alignItems: "center",
              gap: "1.6cqi",
            }}
          >
            <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: "1.1cqi", opacity: 0.55, pointerEvents: "none" }} title="Fijo">
              <img src={window.App.appUrl("/images/certificado/bebras.webp")} alt="" style={{ height: "6.6cqi", width: "auto" }} />
              <p style={{ margin: 0, fontFamily: "Poppins, var(--font-sans)", fontSize: "2.35cqi", lineHeight: 0.9, fontWeight: 700, textTransform: "uppercase", color: "#1B8F60" }}>
                <span style={{ display: "block" }}>Bebras</span>
                <span style={{ display: "block" }}>Bolivia</span>
              </p>
            </div>
            {logos.length > 0 ? <span style={{ height: "5.8cqi", width: "0.12cqi", flexShrink: 0, background: "rgba(43,33,28,0.15)" }} /> : null}
            {logos.map((logo, index) => {
              const isSelected = logo.id === selected;
              return (
                <div
                  key={logo.id}
                  ref={(element) => {
                    if (element) logoRefs.current.set(logo.id, element);
                    else logoRefs.current.delete(logo.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Logo ${logo.alt || index + 1}`}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => onLogoPointerDown(event, logo)}
                  onFocus={() => setSelected(logo.id)}
                  onKeyDown={(event) => onLogoKeyDown(event, logo, index)}
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    cursor: "grab",
                    touchAction: "none",
                    outline: isSelected ? "2px solid var(--accent)" : "1px dashed transparent",
                    outlineOffset: "0.4cqi",
                  }}
                >
                  <img src={previewSrc(logo.src)} alt={logo.alt} draggable={false} style={{ display: "block", height: `${logo.height}cqi`, width: "auto", userSelect: "none" }} />
                  {isSelected ? (
                    <span
                      onPointerDown={(event) => onHandlePointerDown(event, logo)}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: "-0.9cqi",
                        bottom: "-0.9cqi",
                        width: 12,
                        height: 12,
                        background: "var(--accent)",
                        border: "2px solid #FDFCFB",
                        cursor: "nwse-resize",
                        touchAction: "none",
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <p style={{ position: "absolute", top: "17.4cqi", left: "9cqi", margin: 0, fontFamily: "Poppins, var(--font-sans)", fontSize: "5.4cqi", lineHeight: 1, letterSpacing: "-0.025em", fontWeight: 700, color: "#324C87", opacity: 0.35, pointerEvents: "none" }}>
            Certificado
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
        <input
          ref={addInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void addLogo(file);
          }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void replaceLogo(file);
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addInput.current?.click()} disabled={busy !== null}>
          {busy === "upload" ? "Subiendo..." : "Agregar logo"}
        </button>

        {current ? (
          <>
            <span style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => replaceInput.current?.click()} disabled={busy !== null}>
              Cambiar imagen
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
              Tamaño
              <input
                type="range"
                min={MIN_HEIGHT}
                max={MAX_HEIGHT}
                step={0.1}
                value={current.height}
                onChange={(event) => update(current.id, { height: clampHeight(Number(event.target.value)) })}
              />
            </label>
            <input
              className="form-input"
              style={{ width: "16rem" }}
              value={current.alt}
              maxLength={120}
              placeholder="Nombre de la institución"
              aria-label="Nombre de la institución"
              onChange={(event) => update(current.id, { alt: event.target.value })}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(current.id)}>
              Quitar
            </button>
          </>
        ) : (
          <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
            Toca un logo para cambiarlo. Arrástralo para moverlo y tira de su esquina para cambiar el tamaño.
          </span>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setLogos(saved);
              setSelected(null);
            }}
            disabled={!dirty || busy !== null}
          >
            Descartar cambios
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy !== null}>
            {busy === "save" ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
