
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

type PreviewScrollPosition = {
  x: number;
  y: number;
};

let pendingScrollRestore: PreviewScrollPosition | null = null;

function getIframeScrollPosition(iframe: HTMLIFrameElement): PreviewScrollPosition | null {
  try {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) return null;

    return {
      x: win.scrollX || doc.documentElement.scrollLeft || doc.body?.scrollLeft || 0,
      y: win.scrollY || doc.documentElement.scrollTop || doc.body?.scrollTop || 0,
    };
  } catch {
    return null;
  }
}

function restoreIframeScrollPosition(iframe: HTMLIFrameElement, position: PreviewScrollPosition): void {
  const tryRestore = (attempt = 0) => {
    try {
      iframe.contentWindow?.scrollTo(position.x, position.y);
    } catch {
      return;
    }

    if (attempt < 6) {
      window.setTimeout(() => tryRestore(attempt + 1), 80);
    }
  };

  tryRestore();
}

async function ensure(editor: SafeAny): Promise<void> {
  const overlay = document.getElementById("preview-overlay");
  const overlayText = document.getElementById("preview-overlay-text");
  const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;

  try {
    const status = await window.API.previewStatus();
    if (status.running) {
      editor.devServerReady = true;
      editor.devServerPort = status.port;
      editor.previewMode = status.mode || "dev";
      load(editor);
      return;
    }
  } catch {
    // Ignore and try to start preview below.
  }

  if (overlay) overlay.style.display = "flex";
  if (overlayText) overlayText.textContent = "Cargando la vista previa de tu página...";
  editor.devServerStarting = true;

  try {
    const result = await window.API.startPreview();
    editor.devServerReady = true;
    editor.devServerStarting = false;
    editor.devServerPort = result.port;
    editor.previewMode = result.mode || "dev";

    await new Promise((resolve) => setTimeout(resolve, 500));

    load(editor);
    window.Toast.success(result.mode === "static" ? "Vista previa lista" : "Vista previa lista — tus cambios se ven al guardar");
  } catch (err: SafeAny) {
    editor.devServerStarting = false;
    window.Toast.error(`Error al iniciar vista previa: ${err.message}`);

    if (iframe) {
      iframe.srcdoc = `<html><body style="font-family:system-ui;padding:2rem;background:#1a1a2e;color:#e2e8f0;">
        <h3 style="color:#ef4444;">No se pudo cargar la vista previa</h3>
        <p style="color:#94a3b8;margin-top:0.5rem;">Puedes seguir editando y guardar tus cambios con normalidad. La vista previa se mostrará en cuanto esté disponible.</p>
        <pre style="white-space:pre-wrap;font-size:0.75rem;background:#0f0f23;padding:1rem;border-radius:6px;overflow:auto;color:#64748b;margin-top:1rem;">${editor.escapeForPre(err.message)}</pre>
      </body></html>`;
    }
  } finally {
    if (overlay) overlay.style.display = "none";
  }
}

function load(editor: SafeAny, forceReload = false): void {
  const iframe = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  if (!iframe) return;

  const pagePath = editor.fileToPage[editor.currentFile] || "/";
  const base = window.App.appUrl(`/preview-site${pagePath}`);
  const scrollPosition = getIframeScrollPosition(iframe);

  if (forceReload && scrollPosition) {
    pendingScrollRestore = scrollPosition;
  }

  iframe.onload = () => {
    if (!pendingScrollRestore) return;
    const position = pendingScrollRestore;
    pendingScrollRestore = null;
    restoreIframeScrollPosition(iframe, position);
  };

  iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
}

export function registerEditorPreview(): void {
  window.CMSEditorPreview = { ensure, load };
}
