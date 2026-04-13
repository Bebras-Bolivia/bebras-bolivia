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
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

export default function SnapshotsView({ snapshots, icons, onCreate, onRestore, onDelete }: Props) {
  const ordered = [...(snapshots || [])].sort((a, b) => b.id - a.id);

  return (
    <>
      <div className="flex justify-between items-center mb-lg">
        <span className="text-muted text-sm">
          {ordered.length} snapshot{ordered.length !== 1 ? "s" : ""}
        </span>
        <button className="btn btn-primary btn-sm" onClick={onCreate}>
          <span dangerouslySetInnerHTML={iconHtml(icons, "plus")}></span> Crear snapshot
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="empty-state">
          <h3>Sin snapshots</h3>
          <p>Crea un snapshot para guardar el estado actual del contenido.</p>
        </div>
      ) : (
        <div>
          {ordered.map((snap) => {
            const date = new Date(snap.createdAt || snap.date || Date.now()).toLocaleString("es-BO", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div className="snapshot-item" key={snap.id}>
                <div className="meta">
                  <div className="id">Snapshot #{snap.id}</div>
                  <div className="desc">{snap.description || "Sin descripcion"}</div>
                  <div className="date">
                    {date} &mdash; por {snap.author || "Desconocido"}
                  </div>
                </div>
                <div className="actions flex gap-sm">
                  <button className="btn btn-ghost btn-sm" onClick={() => onRestore(snap.id)}>
                    <span dangerouslySetInnerHTML={iconHtml(icons, "refresh")}></span> Restaurar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(snap.id)}>
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
