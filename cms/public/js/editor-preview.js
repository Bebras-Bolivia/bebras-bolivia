// ── Bebras CMS — Editor preview runtime ───────────────────

window.CMSEditorPreview = {
  async ensure(editor) {
    const overlay = document.getElementById("preview-overlay");
    const overlayText = document.getElementById("preview-overlay-text");
    const iframe = document.getElementById("preview-frame");

    try {
      const status = await API.previewStatus();
      if (status.running) {
        editor.devServerReady = true;
        editor.devServerPort = status.port;
        editor.previewMode = status.mode || "dev";
        this.load(editor);
        return;
      }
    } catch {
      // Ignore and try to start the preview server below.
    }

    if (overlay) overlay.style.display = "flex";
    if (overlayText) overlayText.textContent = "Iniciando servidor de vista previa...";
    editor.devServerStarting = true;

    try {
      const result = await API.startPreview();
      editor.devServerReady = true;
      editor.devServerStarting = false;
      editor.devServerPort = result.port;
      editor.previewMode = result.mode || "dev";

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.load(editor);
      Toast.success(result.mode === "static" ? "Vista previa estatica lista" : "Vista previa lista — los cambios se actualizan al guardar");
    } catch (err) {
      editor.devServerStarting = false;
      Toast.error(`Error al iniciar vista previa: ${err.message}`);

      if (iframe) {
        iframe.srcdoc = `<html><body style="font-family:system-ui;padding:2rem;background:#1a1a2e;color:#e2e8f0;">
          <h3 style="color:#ef4444;">Error al iniciar el servidor de vista previa</h3>
          <pre style="white-space:pre-wrap;font-size:0.8rem;background:#0f0f23;padding:1rem;border-radius:6px;overflow:auto;color:#94a3b8;">${editor.escapeForPre(err.message)}</pre>
          <p style="color:#94a3b8;margin-top:1rem;">Podes guardar contenido normalmente. La vista previa se actualizara cuando el servidor este listo.</p>
        </body></html>`;
      }
    } finally {
      if (overlay) overlay.style.display = "none";
    }
  },

  load(editor, forceReload = false) {
    const iframe = document.getElementById("preview-frame");
    if (!iframe) return;

    const pagePath = editor.fileToPage[editor.currentFile] || "/";
    const base = window.App.appUrl(`/preview-site${pagePath}`);

    iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
  },
};
