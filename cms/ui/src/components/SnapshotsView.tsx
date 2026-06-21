import React from "react";

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

export default function SnapshotsView({ snapshots, icons, onCreate, onUpload, onDownload, onRestore, onDelete }: Props) {
  const ordered = [...(snapshots || [])].sort((a, b) => b.id - a.id);

  return (
    <>
      <div className="snapshots-toolbar flex justify-between items-center mb-lg">
        <span className="text-muted text-sm">
          {ordered.length} respaldo{ordered.length !== 1 ? "s" : ""}
        </span>
        <div className="snapshots-toolbar-actions">
          <label className="btn btn-ghost btn-sm">
            <span dangerouslySetInnerHTML={iconHtml(icons, "upload")}></span> Subir respaldo
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
          <button className="btn btn-primary btn-sm" onClick={onCreate}>
            <span dangerouslySetInnerHTML={iconHtml(icons, "plus")}></span> Crear respaldo
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="empty-state">
          <h3>Sin respaldos</h3>
          <p>Crea un respaldo para guardar el estado actual del contenido.</p>
        </div>
      ) : (
        <div>
          {ordered.map((snap) => {
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
        </div>
      )}
    </>
  );
}
