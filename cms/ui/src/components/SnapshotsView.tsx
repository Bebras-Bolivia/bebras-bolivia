import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Snapshot = {
  id: number;
  description?: string;
  author?: string;
  createdAt?: string;
  date?: string;
};

interface Props {
  snapshots: Snapshot[];
  icons: Record<string, string>;
  onCreate: () => void;
  onUpload: (file: File) => void;
  onDownload: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

function formatSnapshotDate(value?: string) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAILY_RETENTION_DAYS = 30;
const MONTHLY_RETENTION_MONTHS = 12;

type AgeBucket = "daily" | "monthly" | "yearly";

const BUCKET_LABELS: Record<AgeBucket, string> = {
  daily: "Últimos 30 días",
  monthly: "Últimos 12 meses",
  yearly: "Años anteriores",
};

const BUCKET_ORDER: AgeBucket[] = ["daily", "monthly", "yearly"];

function bucketFor(value: string | undefined, now: Date): AgeBucket {
  const created = value ? new Date(value) : null;
  if (!created || Number.isNaN(created.getTime())) return "yearly";

  const dailyCutoff = new Date(now);
  dailyCutoff.setDate(dailyCutoff.getDate() - DAILY_RETENTION_DAYS);

  const monthlyCutoff = new Date(now);
  monthlyCutoff.setMonth(monthlyCutoff.getMonth() - MONTHLY_RETENTION_MONTHS);

  if (created >= dailyCutoff) return "daily";
  if (created >= monthlyCutoff) return "monthly";
  return "yearly";
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default function SnapshotsView({ snapshots, icons, onCreate, onUpload, onDownload, onRestore, onDelete }: Props) {
  const [headerSlot] = useState<HTMLElement | null>(() => document.getElementById("header-editor-actions"));
  const [headerSubtitleSlot] = useState<HTMLElement | null>(() => document.getElementById("header-subtitle"));

  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRevision = useRef(0);

  const ordered = [...(snapshots || [])].sort((a, b) => b.id - a.id);

  const now = new Date();
  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    items: ordered.filter((snap) => bucketFor(snap.createdAt || snap.date, now) === bucket),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    return () => {
      window.API.cleanupSnapshotPreview().catch(() => {});
    };
  }, []);

  const openPreview = async (id: number) => {
    const revision = ++previewRevision.current;
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewSrc("");

    try {
      const status = await window.API.previewStatus().catch(() => null);
      if (!status?.running) await window.API.startPreview();
      await window.API.syncSnapshotPreview(id);

      if (revision !== previewRevision.current) return;

      await new Promise((resolve) => window.setTimeout(resolve, 900));
      if (revision !== previewRevision.current) return;

      setPreviewSrc(`${window.App.appUrl("/preview-site/")}?t=${Date.now()}`);
    } catch (err: unknown) {
      if (revision !== previewRevision.current) return;
      setPreviewError(err instanceof Error ? err.message : "No se pudo generar la vista previa.");
    } finally {
      if (revision === previewRevision.current) setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    previewRevision.current++;
    setPreviewId(null);
    setPreviewSrc("");
    setPreviewError(null);
    setPreviewLoading(false);
    window.API.cleanupSnapshotPreview().catch(() => {});
  };

  const headerActions = headerSlot
    ? createPortal(
        <>
          <label className="btn btn-ghost btn-sm" title="Subir respaldo" aria-label="Subir respaldo">
            <span dangerouslySetInnerHTML={iconHtml(icons, "upload")}></span>
            <span className="btn-text">Subir respaldo</span>
            <input
              type="file"
              accept=".gz,.bebras-snapshot.gz,.json.gz,application/gzip"
              hidden
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) onUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button className="btn btn-primary btn-sm" onClick={onCreate} aria-label="Crear respaldo" title="Crear respaldo">
            <span dangerouslySetInnerHTML={iconHtml(icons, "plus")}></span>
            <span className="btn-text">Crear respaldo</span>
          </button>
        </>,
        headerSlot
      )
    : null;

  const countBadge = headerSubtitleSlot && ordered.length > 0
    ? createPortal(
        <>
          {ordered.length} respaldo{ordered.length !== 1 ? "s" : ""}
        </>,
        headerSubtitleSlot
      )
    : null;

  if (ordered.length === 0) {
    return (
      <>
        {headerActions}
        {countBadge}
        <div className="empty-state">
          <h3>Sin respaldos</h3>
          <p>Crea un respaldo para guardar el estado actual del contenido.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {headerActions}
      {countBadge}

      <div className={`snapshots-layout${previewId !== null ? " has-preview" : ""}`}>
        <div className="snapshots-list">
          {grouped.map((group) => (
            <section className="snapshot-group" key={group.bucket}>
              <div className="snapshot-group-header">
                <span className="snapshot-group-title">{group.label}</span>
                <span className="snapshot-group-count">{group.items.length}</span>
              </div>
              {group.items.map((snap) => {
                const date = formatSnapshotDate(snap.createdAt || snap.date);
                const isActive = snap.id === previewId;

                return (
                  <div className={`snapshot-item${isActive ? " is-active" : ""}`} key={snap.id}>
                    <div className="meta">
                      <div className="id">Respaldo #{snap.id}</div>
                      <div className="desc">{snap.description || "Sin descripcion"}</div>
                      <div className="date">
                        {date} &mdash; por {snap.author || "Desconocido"}
                      </div>
                    </div>
                    <div className="actions flex gap-sm">
                      <button className="btn btn-ghost btn-sm btn-icon-only" aria-label={`Ver respaldo #${snap.id}`} title="Ver" onClick={() => openPreview(snap.id)}>
                        <EyeIcon />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onRestore(snap.id)}>
                        <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> <span className="snapshot-restore-text">Restaurar</span>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon-only" aria-label={`Descargar respaldo #${snap.id}`} onClick={() => onDownload(snap.id)}>
                        <span dangerouslySetInnerHTML={iconHtml(icons, "download")}></span>
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon-only" aria-label={`Eliminar respaldo #${snap.id}`} onClick={() => onDelete(snap.id)}>
                        <span dangerouslySetInnerHTML={iconHtml(icons, "trash")}></span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {previewId !== null && (
          <aside className="snapshots-preview">
            <div className="snapshots-preview-toolbar">
              <div className="snapshots-preview-title">
                Vista previa &mdash; Respaldo #{previewId}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closePreview} aria-label="Cerrar vista previa">
                Cerrar
              </button>
            </div>
            {previewError ? (
              <div className="snapshots-preview-fallback">
                <h3>No se pudo cargar la vista previa</h3>
                <p>{previewError}</p>
              </div>
            ) : previewLoading || !previewSrc ? (
              <div className="snapshots-preview-fallback">
                <div className="spinner"></div>
                <p>Generando la vista previa del respaldo...</p>
              </div>
            ) : (
              <iframe title={`Vista previa del respaldo ${previewId}`} className="snapshots-preview-frame" src={previewSrc} />
            )}
          </aside>
        )}
      </div>
    </>
  );
}
