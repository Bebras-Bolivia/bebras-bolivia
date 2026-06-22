
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
type SafeAny = any;

const Snapshots = {
  async render() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const data = await window.API.listSnapshots();
      const snapshots = data.snapshots || [];

      window.CMSSnapshots?.unmount?.();
      const headerSubtitle = document.getElementById("header-subtitle");
      if (headerSubtitle) headerSubtitle.innerHTML = "";
      const headerEditorActions = document.getElementById("header-editor-actions");
      if (headerEditorActions) headerEditorActions.innerHTML = "";
      main.innerHTML = '<div id="react-snapshots-root"></div>';
      const root = document.getElementById("react-snapshots-root");
      if (!root || !window.CMSSnapshots?.mountList) return;

      window.CMSSnapshots.mountList(root, {
        snapshots,
        icons: window.App.icons,
        onCreate: () => this.handleCreate(),
        onRestore: (id: number) => this.handleRestore(id),
        onDelete: (id: number) => this.handleDelete(id),
      });
    } catch (err: SafeAny) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  async handleCreate() {
    const description = prompt("Descripcion del respaldo (opcional):");
    if (description === null) return;

    try {
      await window.API.createSnapshot(description);
      window.Toast.success("Respaldo creado");
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al crear respaldo: ${err.message}`);
    }
  },

  async handleRestore(id: number) {
    if (!confirm(`Restaurar respaldo #${id}? Esto reemplazara el contenido actual.`)) return;

    try {
      await window.API.restoreSnapshot(id);
      window.Toast.success(`Respaldo #${id} restaurado`);
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al restaurar: ${err.message}`);
    }
  },

  async handleDelete(id: number) {
    if (!confirm(`Eliminar respaldo #${id}? Esta accion no se puede deshacer.`)) return;

    try {
      await window.API.deleteSnapshot(id);
      window.Toast.success("Respaldo eliminado");
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al eliminar: ${err.message}`);
    }
  },
};

export function registerSnapshotsController(): void {
  window.Snapshots = Snapshots;
}
