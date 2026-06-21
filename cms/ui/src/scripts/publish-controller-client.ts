const Publish = {
  async render() {
    const main = document.getElementById("main-content");
    if (!main) return;

    try {
      const [status, changes, schedule] = await Promise.all([
        window.API.publishStatus(),
        window.API.publishChanges(),
        window.API.publishSchedule(),
      ]);

      main.innerHTML = '<div id="react-publish-root"></div>';
      const root = document.getElementById("react-publish-root");
      if (!root || !window.CMSPublish?.mount) return;

      window.CMSPublish.mount(root, {
        status,
        changes,
        schedule,
        icons: window.App.icons,
        onPublish: () => window.App.handlePublish().then(() => this.render()),
        onSchedule: (runAtLocal: string) => this.handleSchedule(runAtLocal),
        onCancelSchedule: (id: number) => this.handleCancelSchedule(id),
        onRefresh: () => this.render(),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(errMsg)}</p></div>`;
    }
  },

  async handleSchedule(runAtLocal: string) {
    const date = new Date(runAtLocal);
    if (Number.isNaN(date.getTime())) {
      window.Toast.error("Elige una fecha válida");
      return;
    }

    try {
      await window.API.schedulePublish(date.toISOString());
      window.Toast.success("Publicación programada");
      this.render();
    } catch (err: unknown) {
      window.Toast.error(`Error al programar: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  async handleCancelSchedule(id: number) {
    const confirmed = await window.CMSModal?.openConfirm?.({
      title: "Cancelar publicación programada",
      message: "La publicación automática no se ejecutará.",
      confirmLabel: "Cancelar programación",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await window.API.cancelScheduledPublish(id);
      window.Toast.success("Programación cancelada");
      this.render();
    } catch (err: unknown) {
      window.Toast.error(`Error al cancelar: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

export function registerPublishController(): void {
  window.Publish = Publish;
}
