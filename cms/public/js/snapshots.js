// ── Bebras CMS — Snapshot Browser ───────────────────────
// List, create, restore, and delete content snapshots.

const Snapshots = {
  // ── Render snapshot list ────────────────────────────────
  async render() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const data = await API.listSnapshots();
      const snapshots = data.snapshots || [];

      // Header with create button
      let headerHtml = `
        <div class="flex justify-between items-center mb-lg">
          <span class="text-muted text-sm">${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""}</span>
          <button class="btn btn-primary btn-sm" id="snapshot-create-btn">${App.icon("plus")} Crear snapshot</button>
        </div>`;

      if (snapshots.length === 0) {
        main.innerHTML = `
          ${headerHtml}
          <div class="empty-state">
            <h3>Sin snapshots</h3>
            <p>Crea un snapshot para guardar el estado actual del contenido.</p>
          </div>`;
      } else {
        const listHtml = snapshots
          .sort((a, b) => b.id - a.id)
          .map((snap) => {
            const date = new Date(snap.createdAt || snap.date).toLocaleString("es-BO", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return `
            <div class="snapshot-item" data-id="${snap.id}">
              <div class="meta">
                <div class="id">Snapshot #${snap.id}</div>
                <div class="desc">${App.escapeHtml(snap.description || "Sin descripcion")}</div>
                <div class="date">${date} — por ${App.escapeHtml(snap.author || "Desconocido")}</div>
              </div>
              <div class="actions flex gap-sm">
                <button class="btn btn-ghost btn-sm snapshot-restore-btn" data-id="${snap.id}">${App.icon("refresh")} Restaurar</button>
                <button class="btn btn-danger btn-sm snapshot-delete-btn" data-id="${snap.id}">${App.icon("trash")}</button>
              </div>
            </div>`;
          })
          .join("");

        main.innerHTML = `
          ${headerHtml}
          <div>${listHtml}</div>`;
      }

      if (window.CMSSnapshots && typeof window.CMSSnapshots.mountList === "function") {
        main.innerHTML = '<div id="react-snapshots-root"></div>';
        const root = document.getElementById("react-snapshots-root");
        if (root) {
          window.CMSSnapshots.mountList(root, {
            snapshots,
            icons: App.icons,
            onCreate: () => this.handleCreate(),
            onRestore: (id) => this.handleRestore(id),
            onDelete: (id) => this.handleDelete(id),
          });
          return;
        }
      }

      // Bind events
      document.getElementById("snapshot-create-btn").addEventListener("click", () => {
        this.handleCreate();
      });

      main.querySelectorAll(".snapshot-restore-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute("data-id"), 10);
          this.handleRestore(id);
        });
      });

      main.querySelectorAll(".snapshot-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute("data-id"), 10);
          this.handleDelete(id);
        });
      });
    } catch (err) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  },

  // ── Create snapshot ─────────────────────────────────────
  async handleCreate() {
    const description = prompt("Descripcion del snapshot (opcional):");
    if (description === null) return; // Cancelled

    const createBtn = document.getElementById("snapshot-create-btn");
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Creando...';
    }

    try {
      await API.createSnapshot(description);
      Toast.success("Snapshot creado");
      this.render();
    } catch (err) {
      Toast.error(`Error al crear snapshot: ${err.message}`);
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = `${App.icon("plus")} Crear snapshot`;
      }
    }
  },

  // ── Restore snapshot ────────────────────────────────────
  async handleRestore(id) {
    if (!confirm(`Restaurar snapshot #${id}? Esto reemplazara el contenido actual.`)) {
      return;
    }

    try {
      await API.restoreSnapshot(id);
      Toast.success(`Snapshot #${id} restaurado`);
      this.render();
    } catch (err) {
      Toast.error(`Error al restaurar: ${err.message}`);
    }
  },

  // ── Delete snapshot ─────────────────────────────────────
  async handleDelete(id) {
    if (!confirm(`Eliminar snapshot #${id}? Esta accion no se puede deshacer.`)) {
      return;
    }

    try {
      await API.deleteSnapshot(id);
      Toast.success("Snapshot eliminado");
      this.render();
    } catch (err) {
      Toast.error(`Error al eliminar: ${err.message}`);
    }
  },
};
