import React from "react";

type CertificateContest = {
  id: string;
  title: string;
  year: number;
  count: number;
  syncedAt: string;
};

type CertificatesState = {
  sourceUrl: string | null;
  syncedAt: string | null;
  total: number;
  contests: CertificateContest[];
};

interface Props {
  icons: Record<string, string>;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

function sourceHost(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export default function CertificatesView({ icons }: Props) {
  const [state, setState] = React.useState<CertificatesState | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState<"save" | "sync" | null>(null);

  React.useEffect(() => {
    window.API.getCertificates()
      .then((data: CertificatesState) => {
        setState(data);
        setEditing(!data.sourceUrl);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const saveSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("save");
    try {
      const data = await window.API.saveCertificatesSource(url.trim());
      setState(data);
      setEditing(false);
      setUrl("");
      window.Toast.success("Enlace guardado. Ahora toca «Actualizar».");
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudo guardar el enlace");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const data = await window.API.syncCertificates();
      setState(data);
      window.Toast.success(
        data.received === 1
          ? "Se trajo 1 certificado. El sitio se publicará en unos segundos."
          : `Se trajeron ${data.received} certificados. El sitio se publicará en unos segundos.`
      );
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (contest: CertificateContest) => {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: `Quitar «${contest.title}»`,
      message: `Sus ${contest.count} certificados dejarán de estar en el sitio. Si el concurso todavía lo tiene, vuelve con «Actualizar».`,
      confirmLabel: "Quitar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      setState(await window.API.removeCertificatesContest(contest.id));
      window.Toast.success("Desafío quitado");
    } catch (err) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudo quitar");
    }
  };

  if (loadError) {
    return (
      <div className="empty-state">
        <h3>Error</h3>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="loading-state">
        <div className="spinner"></div> Cargando...
      </div>
    );
  }

  const host = sourceHost(state.sourceUrl);

  return (
    <div className="publish-page">
      <section className="publish-hero card">
        <div>
          <div className="publish-eyebrow">Certificados del concurso</div>
          <h2>
            {state.total === 0
              ? "Todavía no hay certificados"
              : `${state.total} certificado${state.total === 1 ? "" : "s"} en el sitio`}
          </h2>
          <p>
            Los estudiantes ven el suyo en la página <strong>/certificado</strong> escribiendo su código personal. Última
            actualización: {formatDate(state.syncedAt)}
          </p>
        </div>
        <div className="publish-hero-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={sync} disabled={!state.sourceUrl || busy !== null}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> {busy === "sync" ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Enlace del concurso</div>
        </div>
        {editing ? (
          <form className="publish-schedule-form" onSubmit={saveSource}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="certificates-source">Enlace de certificados</label>
              <input
                id="certificates-source"
                type="url"
                className="form-input"
                placeholder="https://.../api/certificates/export?key=..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoComplete="off"
              />
              <span className="form-hint">En el concurso: Administrador → Certificados → Copiar enlace.</span>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!url.trim() || busy !== null}>
              {busy === "save" ? "Guardando..." : "Guardar"}
            </button>
            {state.sourceUrl ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            ) : null}
          </form>
        ) : (
          <div className="publish-hero-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <p className="text-muted">Conectado con {host ?? "el concurso"}.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Cambiar enlace
            </button>
          </div>
        )}
      </section>

      <section className="card publish-changes-card">
        <div className="card-header">
          <div className="card-title">Desafíos guardados</div>
        </div>
        {state.contests.length === 0 ? (
          <div className="empty-state publish-empty-state">
            <h3>Sin desafíos</h3>
            <p>Toca «Actualizar» cuando un desafío del concurso tenga sus resultados publicados.</p>
          </div>
        ) : (
          <div className="publish-change-list">
            {state.contests.map((contest) => (
              <article className="publish-change-item" key={contest.id}>
                <div className="publish-change-main">
                  <span className="badge badge-success">{contest.year}</span>
                  <div>
                    <h3>{contest.title}</h3>
                    <p>
                      {contest.count} certificado{contest.count === 1 ? "" : "s"} · actualizado {formatDate(contest.syncedAt)}
                    </p>
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: "end", width: "auto" }} onClick={() => remove(contest)}>
                  Quitar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
