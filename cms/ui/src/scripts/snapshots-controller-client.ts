
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
type SafeAny = any;

const Snapshots = {
  async render() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const data = await window.API.listSnapshots();
      const snapshots = data.snapshots || [];

      main.innerHTML = '<div id="react-snapshots-root"></div>';
      const root = document.getElementById("react-snapshots-root");
      if (!root || !window.CMSSnapshots?.mountList) return;

      window.CMSSnapshots.mountList(root, {
        snapshots,
        icons: window.App.icons,
        onCreate: () => this.handleCreate(),
        onUpload: (file: File) => this.handleUpload(file),
        onDownload: (id: number) => this.handleDownload(id),
        onRestore: (id: number) => this.handleRestore(id),
        onDelete: (id: number) => this.handleDelete(id),
      });
    } catch (err: SafeAny) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  async handleCreate() {
    const description = await window.CMSModal?.openInput?.({
      title: "Crear respaldo",
      subtitle: "Ingresa un nombre o descripcion para identificar este respaldo.",
      label: "Nombre del respaldo",
      placeholder: "Ej. Antes de actualizar preguntas frecuentes",
      confirmLabel: "Crear respaldo",
      cancelLabel: "Cancelar",
      defaultValue: "",
      maxLength: 120,
    });
    if (description === null) return;
    if (description.trim().length > 120) {
      window.Toast.error("El nombre del respaldo es demasiado largo");
      return;
    }

    try {
      await window.API.createSnapshot(description.trim());
      window.Toast.success("Respaldo creado");
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al crear respaldo: ${err.message}`);
    }
  },

  async handleRestore(id: number) {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: `Restaurar respaldo #${id}`,
      message: "Esto reemplazara el contenido actual del CMS por el del respaldo seleccionado.",
      confirmLabel: "Restaurar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await window.API.restoreSnapshot(id);
      window.Toast.success(`Respaldo #${id} restaurado`);
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al restaurar: ${err.message}`);
    }
  },

  handleDownload(id: number) {
    const link = document.createElement("a");
    link.href = window.API.downloadSnapshotUrl(id);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async handleUpload(file: File) {
    try {
      await window.API.uploadSnapshot(file);
      window.Toast.success("Respaldo importado");
      this.render();
    } catch (err: SafeAny) {
      window.Toast.error(`Error al importar: ${err.message}`);
    }
  },

  async handleDelete(id: number) {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: `Eliminar respaldo #${id}`,
      message: "Esta accion no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) return;

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
