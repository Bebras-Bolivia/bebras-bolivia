import React, { useState } from "react";
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

export default function SnapshotsView({ snapshots, icons, onCreate, onUpload, onDownload, onRestore, onDelete }: Props) {
  const [headerSlot] = useState<HTMLElement | null>(() => document.getElementById("header-editor-actions"));
  const [headerSubtitleSlot] = useState<HTMLElement | null>(() => document.getElementById("header-subtitle"));

  const ordered = [...(snapshots || [])].sort((a, b) => b.id - a.id);

  const now = new Date();
  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    items: ordered.filter((snap) => bucketFor(snap.createdAt || snap.date, now) === bucket),
  })).filter((group) => group.items.length > 0);

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

  return (
    <>
      {headerActions}
      {countBadge}

      {ordered.length === 0 ? (
        <div className="empty-state">
          <h3>Sin respaldos</h3>
          <p>Crea un respaldo para guardar el estado actual del contenido.</p>
        </div>
      ) : (
        <div>
          {grouped.map((group) => (
            <section className="snapshot-group" key={group.bucket}>
              <div className="snapshot-group-header">
                <span className="snapshot-group-title">{group.label}</span>
                <span className="snapshot-group-count">{group.items.length}</span>
              </div>
              {group.items.map((snap) => {
                const date = formatSnapshotDate(snap.createdAt || snap.date);

                return (
                  <div className="snapshot-item" key={snap.id}>
                    <div className="meta">
                      <div className="id">Respaldo #{snap.id}</div>
                      <div className="desc">{snap.description || "Sin descripcion"}</div>
                      <div className="date">
                        {date} &mdash; por {snap.author || "Desconocido"}
                      </div>
                    </div>
                    <div className="actions flex gap-sm">
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
      )}
    </>
  );
}
