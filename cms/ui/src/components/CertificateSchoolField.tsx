import React from "react";

export type CatalogSchool = {
  code: string;
  name: string;
  department: string | null;
  city: string;
  district: string;
};

interface Props {
  id: string;
  department: string;
  value: CatalogSchool | null;
  onChange: (school: CatalogSchool | null) => void;
}

export default function CertificateSchoolField({ id, department, value, onChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CatalogSchool[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus("loading");
      window.API.searchCertificateSchools(text, department)
        .then((found: CatalogSchool[]) => {
          if (cancelled) return;
          setResults(found);
          setActive(0);
          setStatus("idle");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, department]);

  const choose = (school: CatalogSchool) => {
    onChange(school);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    requestAnimationFrame(() => input.current?.focus());
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  if (value) {
    return (
      <div
        className="form-input"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", paddingTop: "0.4rem", paddingBottom: "0.4rem" }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.name}</div>
          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
            {[value.district, value.city].filter((part, index, parts) => part && parts.indexOf(part) === index).join(" · ")}
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clear} aria-label="Quitar colegio">
          Cambiar
        </button>
      </div>
    );
  }

  const text = query.trim();
  const showList = open && text.length >= 2;

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        ref={input}
        className="form-input"
        value={query}
        placeholder="Busca por el nombre del colegio"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        onChange={(event) => {
          setQuery(event.target.value);
          setResults([]);
          setStatus(event.target.value.trim().length >= 2 ? "loading" : "idle");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showList ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            maxHeight: "16rem",
            overflowY: "auto",
            margin: 0,
            padding: "0.25rem",
            listStyle: "none",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {results.length === 0 ? (
            <li className="text-muted" style={{ padding: "0.5rem 0.625rem", fontSize: "0.8125rem" }}>
              {status === "loading"
                ? "Buscando..."
                : status === "error"
                  ? "No se pudo buscar. Vuelve a intentar."
                  : department
                    ? "No hay colegios con ese nombre en este departamento."
                    : "No hay colegios con ese nombre."}
            </li>
          ) : (
            results.map((school, index) => (
              <li
                key={school.code}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(school);
                }}
                onMouseEnter={() => setActive(index)}
                style={{
                  padding: "0.5rem 0.625rem",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  background: index === active ? "var(--bg-hover)" : "transparent",
                }}
              >
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{school.name}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {[school.district, school.city].filter((part, i, parts) => part && parts.indexOf(part) === i).join(" · ")}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
