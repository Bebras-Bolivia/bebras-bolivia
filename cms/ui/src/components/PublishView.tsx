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
  const date = new Date(value);
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
  const hasChanges = changes.summary.total > 0;

  return (
    <div className="publish-page">
      <section className="publish-hero card">
        <div>
          <div className="publish-eyebrow">Publicación del sitio</div>
          <h2>{hasChanges ? `${changes.summary.total} cambio${changes.summary.total === 1 ? "" : "s"} sin publicar` : "Todo está publicado"}</h2>
          <p>
            Revisa qué archivos cambiaron antes de publicar, o programa una publicación automática para más adelante.
          </p>
        </div>
        <div className="publish-hero-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> Actualizar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onPublish} disabled={isPublishing}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "publish")}></span> {isPublishing ? "Publicando..." : "Publicar ahora"}
          </button>
        </div>
      </section>

      <div className="publish-grid">
        <section className="card publish-status-card">
          <div className="card-header">
            <div className="card-title">Estado</div>
          </div>
          <div className="publish-status-list">
            <div>
              <span>Última publicación</span>
              <strong>{formatDate(lastPublishDate)}</strong>
            </div>
            <div>
              <span>Estado actual</span>
              <strong>{isPublishing ? "Publicando" : statusLabel(status?.lastPublish?.status || "Sin registro")}</strong>
            </div>
          </div>
        </section>

        <section className="card publish-schedule-card">
          <div className="card-header">
            <div className="card-title">Programar publicación</div>
          </div>
          {schedule.active ? (
            <div className="publish-active-schedule">
              <div>
                <span className="badge badge-info">{statusLabel(schedule.active.status)}</span>
                <strong>{formatDate(schedule.active.run_at)}</strong>
              </div>
              {schedule.active.status === "scheduled" ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancelSchedule(schedule.active!.id)}>
                  Cancelar
                </button>
              ) : null}
            </div>
          ) : (
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
          )}
        </section>
      </div>

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

      {schedule.history.length > 0 ? (
        <section className="card publish-history-card">
          <div className="card-header">
            <div className="card-title">Historial programado</div>
          </div>
          <div className="publish-history-list">
            {schedule.history.map((item) => (
              <div className="publish-history-item" key={item.id}>
                <span className="badge badge-info">{statusLabel(item.status)}</span>
                <span>{formatDate(item.run_at)}</span>
                {item.output ? <small>{item.output}</small> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
