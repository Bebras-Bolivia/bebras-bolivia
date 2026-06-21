import express from "express";
import cookieParser from "cookie-parser";
import { resolve } from "path";
import { mkdir, cp, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { config } from "./config.js";
import { getDb } from "./db/index.js";
import { syncConfiguredAdmin } from "./db/admin.js";
import { authRouter } from "./auth/routes.js";
import { requireAuth } from "./auth/middleware.js";
import { contentRouter } from "./content/routes.js";
import { blogRouter } from "./blog/routes.js";
import { mediaRouter } from "./media/routes.js";
import { snapshotRouter } from "./snapshots/routes.js";
import { publishRouter } from "./publish/routes.js";
import { previewRouter } from "./preview/routes.js";
import { isDevServerRunning, getDevServerUrl, stopDevServer } from "./preview/service.js";
import { CONTENT_FILES } from "./content/schemas.js";

const app = express();

function stripBasePath(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const { basePath } = config;
  if (basePath && (req.url === basePath || req.url.startsWith(`${basePath}/`))) {
    req.url = req.url.slice(basePath.length) || "/";
    delete (req as express.Request & { _parsedUrl?: unknown })._parsedUrl;
    delete (req as express.Request & { _parsedOriginalUrl?: unknown })._parsedOriginalUrl;
  }
  next();
}

function withBasePath(path: string): string {
  return config.basePath ? `${config.basePath}${path}` : path;
}

function rewritePreviewHtml(html: string): string {
  if (!config.basePath) return html;

  return html
    .replace(/(\s(?:src|href)=['"])(\/(?:_astro\/|@vite\/|@fs\/|node_modules\/|images\/|favicon\.svg))/g, `$1${config.basePath}$2`)
    .replace(/(url\(['"]?)(\/(?:_astro\/|images\/))/g, `$1${config.basePath}$2`);
}

async function ensureRuntimeDirectories() {
  const uploadsDir = resolve(config.landingPublicDir, "images", "uploads");
  await Promise.all([
    mkdir(config.contentDir, { recursive: true }),
    mkdir(config.currentDataDir, { recursive: true }),
    mkdir(config.currentBlogDir, { recursive: true }),
    mkdir(config.snapshotsDir, { recursive: true }),
    mkdir(config.mediaDir, { recursive: true }),
    mkdir(config.landingDataDir, { recursive: true }),
    mkdir(config.landingBlogDir, { recursive: true }),
    mkdir(uploadsDir, { recursive: true }),
  ]);
}

async function copyIfSourceIsNewer(sourcePath: string, targetPath: string): Promise<boolean> {
  try {
    const sourceStat = await stat(sourcePath);
    try {
      const targetStat = await stat(targetPath);
      if (targetStat.mtimeMs >= sourceStat.mtimeMs) {
        return false;
      }
    } catch {
      // Target missing; copy below.
    }

    await cp(sourcePath, targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncWorkingCopiesFromLanding() {
  let syncedContent = 0;
  let syncedBlog = 0;

  for (const filename of CONTENT_FILES) {
    const updated = await copyIfSourceIsNewer(
      resolve(config.landingDataDir, filename),
      resolve(config.currentDataDir, filename)
    );
    if (updated) syncedContent++;
  }

  try {
    const blogFiles = (await readdir(config.landingBlogDir)).filter((file) => file.endsWith(".md"));
    for (const filename of blogFiles) {
      const updated = await copyIfSourceIsNewer(
        resolve(config.landingBlogDir, filename),
        resolve(config.currentBlogDir, filename)
      );
      if (updated) syncedBlog++;
    }
  } catch {
    // No landing blog directory yet.
  }

  if (syncedContent > 0 || syncedBlog > 0) {
    console.log(`[Boot] Synced ${syncedContent} content file(s) and ${syncedBlog} blog file(s) from landing source.`);
  }
}

// ── Middleware ──────────────────────────────────────────────
app.use(stripBasePath);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);

// Authenticated routes
app.use("/api/content", requireAuth, contentRouter);
app.use("/api/blog", requireAuth, blogRouter);
app.use("/api/media", requireAuth, mediaRouter);
app.use("/api/snapshots", requireAuth, snapshotRouter);
app.use("/api/publish", requireAuth, publishRouter);
app.use("/api/preview", requireAuth, previewRouter);

// ── Health check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Preview: proxy to Astro dev server ─────────────────────
// When the Astro dev server is running, proxy /preview-site/* requests
// to localhost:4321. This enables live HMR preview.
// Falls back to landing/dist/ static files when the dev server is off.
const landingDistDir = resolve(config.landingDir, "dist");

app.use("/preview-site", requireAuth, async (req, res, next) => {
  if (!isDevServerRunning()) {
    // Fallback: serve from static build (for when dev server is not running)
    return next();
  }

  try {
    // Proxy to Astro dev server
    const targetUrl = `${getDevServerUrl()}${req.url}`;
    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "accept": req.headers.accept || "*/*",
        "accept-encoding": "identity", // Don't ask for compressed — we'll pipe raw
      },
    });

    // Forward status and headers (strip sensitive/hop-by-hop ones)
    res.status(proxyRes.status);
    const STRIPPED = new Set([
      "transfer-encoding",
      "content-length",
      "set-cookie",
      "connection",
      "keep-alive",
    ]);
    proxyRes.headers.forEach((value, key) => {
      if (!STRIPPED.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const contentType = proxyRes.headers.get("content-type") || "";
    const body = await proxyRes.arrayBuffer();
    if (contentType.includes("text/html")) {
      res.end(rewritePreviewHtml(Buffer.from(body).toString("utf-8")));
      return;
    }

    res.end(Buffer.from(body));
  } catch (err) {
    console.error("[Preview proxy] Error:", err);
    // Dev server might have crashed — fall through to static
    next();
  }
});

// Static fallback for preview (when dev server is not running)
app.use("/preview-site", requireAuth, express.static(landingDistDir));

// Proxy Astro dev server assets at root level (HMR websocket, /_astro/, etc.)
// These are needed because the iframe loads pages that reference /_astro/*, @vite/client, etc.
app.use("/@vite", requireAuth, async (req, res, next) => {
  if (!isDevServerRunning()) return next();
  try {
    const proxyRes = await fetch(`${getDevServerUrl()}/@vite${req.url}`);
    res.status(proxyRes.status);
    proxyRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    res.end(Buffer.from(await proxyRes.arrayBuffer()));
  } catch { next(); }
});

app.use("/@fs", requireAuth, async (req, res, next) => {
  if (!isDevServerRunning()) return next();
  try {
    const proxyRes = await fetch(`${getDevServerUrl()}/@fs${req.url}`);
    res.status(proxyRes.status);
    proxyRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    res.end(Buffer.from(await proxyRes.arrayBuffer()));
  } catch { next(); }
});

app.use("/node_modules", requireAuth, async (req, res, next) => {
  if (!isDevServerRunning()) return next();
  try {
    const proxyRes = await fetch(`${getDevServerUrl()}/node_modules${req.url}`);
    res.status(proxyRes.status);
    proxyRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    res.end(Buffer.from(await proxyRes.arrayBuffer()));
  } catch { next(); }
});

app.use("/_astro", async (req, res, next) => {
  if (!isDevServerRunning()) {
    // Fall through to static serving
    return next();
  }
  try {
    const proxyRes = await fetch(`${getDevServerUrl()}/_astro${req.url}`);
    res.status(proxyRes.status);
    proxyRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    res.end(Buffer.from(await proxyRes.arrayBuffer()));
  } catch { next(); }
});

// Static fallback for /_astro/ and /images/.
// /images points to landing/public so preview posts can load uploaded media from
// /images/uploads/* in both dev-server and static-preview modes.
app.use("/_astro", express.static(resolve(landingDistDir, "_astro")));
app.use("/images", express.static(resolve(config.landingPublicDir, "images")));
app.get("/favicon.svg", (_req, res) => {
  res.sendFile(resolve(landingDistDir, "favicon.svg"));
});

// ── Static files (CMS UI) ─────────────────────────────────
// The CMS UI is the built Astro+React app in ui-dist/. The public/ folder now
// holds only shared assets (styles.css and a no-JS login fallback).
const uiDistDir = resolve(import.meta.dir, "..", "ui-dist");
const publicAssetsDir = resolve(import.meta.dir, "..", "public");
const uiIndexFile = resolve(uiDistDir, "index.html");
const uiLoginFile = resolve(uiDistDir, "login", "index.html");

function hasUiBuild(): boolean {
  return existsSync(uiIndexFile);
}

app.get("/login.html", (_req, res) => {
  if (hasUiBuild() && existsSync(uiLoginFile)) {
    res.sendFile(uiLoginFile);
    return;
  }
  res.sendFile(resolve(publicAssetsDir, "login.html"));
});

app.get("/login", (_req, res) => {
  if (hasUiBuild() && existsSync(uiLoginFile)) {
    res.sendFile(uiLoginFile);
    return;
  }
  res.sendFile(resolve(publicAssetsDir, "login.html"));
});

app.use(express.static(uiDistDir));
app.use(express.static(publicAssetsDir));

// SPA fallback — serve index.html for all non-API, non-preview, non-asset routes
app.get(/^\/(?!api\/|preview-site\/|_astro\/|@vite\/|@fs\/|node_modules\/|images\/|favicon\.svg).*/, (_req, res) => {
  if (hasUiBuild()) {
    res.sendFile(uiIndexFile);
    return;
  }
  res
    .status(503)
    .type("html")
    .send(
      `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Bebras CMS</title></head>` +
        `<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1a1a2e;">` +
        `<h1>La interfaz del CMS no está compilada</h1>` +
        `<p>Ejecuta <code>bun run ui:build</code> dentro de <code>cms/</code> (o usa <code>bun run dev:all</code> desde la raíz) y recarga esta página.</p>` +
        `</body></html>`
    );
});

// ── Admin sync ──────────────────────────────────────────────
async function syncAdminFromEnv() {
  const admin = await syncConfiguredAdmin();
  console.log(`Configured admin ready: ${admin.email}`);
}

// ── Cleanup on exit ────────────────────────────────────────
function cleanup() {
  console.log("\nShutting down...");
  stopDevServer();
  process.exit(0);
}
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function boot() {
  await ensureRuntimeDirectories();
  await syncWorkingCopiesFromLanding();
  getDb();
  await syncAdminFromEnv();
  app.listen(config.port, config.host, () => {
    console.log(`\nBebras CMS running at http://${config.host}:${config.port}${withBasePath("/")}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Base path: ${config.basePath || "/"}`);
    console.log(`Content dir: ${config.contentDir}`);
    console.log(`Landing dir: ${config.landingDir}\n`);
  });
}

boot().catch((err) => {
  console.error("Failed to start CMS:", err);
  process.exit(1);
});

export default app;
