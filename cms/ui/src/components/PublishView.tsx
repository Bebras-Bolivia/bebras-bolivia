import React from "react";

type PublishLog = {
  status?: string;
  finished_at?: string | null;
  started_at?: string;
};

type PublishStatus = {
  isPublishing?: boolean;
  lastPublish?: PublishLog | null;
};

type PublishChange = {
  type: "content" | "blog";
  file: string;
  label: string;
  status: "added" | "modified" | "deleted";
  changedPaths: string[];
  currentUpdatedAt?: string | null;
  publishedUpdatedAt?: string | null;
};

type PublishChanges = {
  summary: {
    total: number;
    content: number;
    blog: number;
    added: number;
    modified: number;
    deleted: number;
  };
  items: PublishChange[];
};

type ScheduledPublish = {
  id: number;
  run_at: string;
  status: string;
  output?: string;
  updated_at?: string;
};

type PublishSchedule = {
  active: ScheduledPublish | null;
  history: ScheduledPublish[];
};

interface Props {
  status: PublishStatus;
  changes: PublishChanges;
  schedule: PublishSchedule;
  icons: Record<string, string>;
  onPublish: () => void;
  onSchedule: (runAtLocal: string) => void;
  onCancelSchedule: (id: number) => void;
  onRefresh: () => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Programada",
    running: "En proceso",
    completed: "Completada",
    cancelled: "Cancelada",
    failed: "Fallida",
    success: "Exitosa",
  };
  return labels[status] || status;
}

function PublishStatusValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="publish-status-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function changeStatusLabel(status: PublishChange["status"]) {
  if (status === "added") return "Nuevo";
  if (status === "deleted") return "Eliminado";
  return "Modificado";
}

function defaultLocalDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function PublishView({ status, changes, schedule, icons, onPublish, onSchedule, onCancelSchedule, onRefresh }: Props) {
  const [runAt, setRunAt] = React.useState(defaultLocalDateTime);
  const isPublishing = Boolean(status?.isPublishing);
  const lastPublishDate = status?.lastPublish?.finished_at || status?.lastPublish?.started_at;
  const lastPublishStatus = status?.lastPublish?.status;
  const hasChanges = changes.summary.total > 0;
  const activeSchedule = schedule.active && ["scheduled", "running"].includes(schedule.active.status) ? schedule.active : null;

  return (
    <div className="publish-page">
      <section className="publish-hero card">
        <div>
          <div className="publish-eyebrow">Publicación del sitio</div>
          <h2>{hasChanges ? `${changes.summary.total} cambio${changes.summary.total === 1 ? "" : "s"} sin publicar` : "Todo está publicado"}</h2>
          <p>Revisa cambios pendientes o programa una publicación automática.</p>
        </div>
        <div className="publish-hero-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> Actualizar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onPublish} disabled={isPublishing || !hasChanges}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "publish")}></span> {isPublishing ? "Publicando..." : "Publicar sitio"}
          </button>
        </div>
      </section>

      <div className="publish-grid">
        <section className="card publish-status-card">
          <div className="card-header">
            <div className="card-title">Estado</div>
          </div>
          <div className="publish-status-list publish-status-list-inline">
            <PublishStatusValue label="Estado" value={isPublishing ? "Publicando" : lastPublishStatus ? statusLabel(lastPublishStatus) : "Sin registro"} />
            <PublishStatusValue label="Última publicación" value={formatDate(lastPublishDate)} />
          </div>
        </section>

        {!activeSchedule ? (
          <section className="card publish-schedule-card">
            <div className="card-header">
              <div className="card-title">Programar publicación</div>
            </div>
            <form
              className="publish-schedule-form"
              onSubmit={(e) => {
                e.preventDefault();
                onSchedule(runAt);
              }}
            >
              <div className="form-group">
                <label htmlFor="publish-run-at">Fecha y hora</label>
                <input id="publish-run-at" type="datetime-local" className="form-input" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Programar</button>
            </form>
          </section>
        ) : null}
      </div>

      {activeSchedule ? (
        <section className="card publish-active-card">
          <div className="publish-active-card-copy">
            <span className={`badge ${activeSchedule.status === "running" ? "badge-warning" : "badge-info"}`}>{statusLabel(activeSchedule.status)}</span>
            <div>
              <h3>{activeSchedule.status === "running" ? "Publicación en proceso" : "Publicación programada"}</h3>
              <p>{formatDate(activeSchedule.run_at)}</p>
            </div>
          </div>
          {activeSchedule.status === "scheduled" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancelSchedule(activeSchedule.id)}>
              Cancelar programación
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="card publish-changes-card">
        <div className="card-header publish-changes-header">
          <div>
            <div className="card-title">Cambios no publicados</div>
            <div className="text-muted text-sm">
              {changes.summary.content} contenido, {changes.summary.blog} blog, {changes.summary.added} nuevos, {changes.summary.modified} modificados, {changes.summary.deleted} eliminados
            </div>
          </div>
        </div>
        {changes.items.length === 0 ? (
          <div className="empty-state publish-empty-state">
            <h3>Sin cambios pendientes</h3>
            <p>El contenido del CMS coincide con el sitio publicado.</p>
          </div>
        ) : (
          <div className="publish-change-list">
            {changes.items.map((item) => (
              <article className="publish-change-item" key={`${item.type}-${item.file}`}>
                <div className="publish-change-main">
                  <span className={`badge publish-change-badge publish-change-${item.status}`}>{changeStatusLabel(item.status)}</span>
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.type === "blog" ? "Publicación del blog" : "Contenido del sitio"} · {item.file}</p>
                  </div>
                </div>
                <div className="publish-change-details">
                  {(item.changedPaths || []).slice(0, 4).map((path) => <span key={path}>{path}</span>)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
