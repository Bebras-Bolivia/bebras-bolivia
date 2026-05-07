import express from "express";
import cookieParser from "cookie-parser";
import { resolve } from "path";
import { mkdir, cp, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { config } from "./config.js";
import { getDb } from "./db/index.js";
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
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── DEBUG: Log all incoming requests ──────────────────────
app.use((req, _res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth", authRouter);

// Authenticated routes
app.use("/api/content", requireAuth, contentRouter);
app.use("/api/blog", requireAuth, blogRouter);
app.use("/api/media", requireAuth, mediaRouter);
app.use("/api/snapshots", requireAuth, snapshotRouter);
app.use("/api/publish", requireAuth, publishRouter);
// DEBUG: direct test route to check if Express even sees this path
app.post("/api/preview/start", (req, res, next) => {
  console.log(`[DEBUG] Direct /api/preview/start matched! method=${req.method}`);
  next();
});
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

app.use("/preview-site", async (req, res, next) => {
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

    // Forward status and headers
    res.status(proxyRes.status);
    proxyRes.headers.forEach((value, key) => {
      // Skip transfer-encoding since Express handles it
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    // Pipe the body
    const body = await proxyRes.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err) {
    console.error("[Preview proxy] Error:", err);
    // Dev server might have crashed — fall through to static
    next();
  }
});

// Static fallback for preview (when dev server is not running)
app.use("/preview-site", express.static(landingDistDir));

// Proxy Astro dev server assets at root level (HMR websocket, /_astro/, etc.)
// These are needed because the iframe loads pages that reference /_astro/*, @vite/client, etc.
app.use("/@vite", async (req, res, next) => {
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

app.use("/@fs", async (req, res, next) => {
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

app.use("/node_modules", async (req, res, next) => {
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

// Static fallback for /_astro/ and /images/ (when dev server is off, serve from dist)
app.use("/_astro", express.static(resolve(landingDistDir, "_astro")));
app.use("/images", express.static(resolve(landingDistDir, "images")));
app.get("/favicon.svg", (_req, res) => {
  res.sendFile(resolve(landingDistDir, "favicon.svg"));
});

// ── Static files (CMS UI) ─────────────────────────────────
const uiDistDir = resolve(import.meta.dir, "..", "ui-dist");
const legacyPublicDir = resolve(import.meta.dir, "..", "public");
const uiIndexFile = resolve(uiDistDir, "index.html");
const uiLoginFile = resolve(uiDistDir, "login", "index.html");

function hasUiBuild(): boolean {
  return existsSync(uiIndexFile);
}

app.use(express.static(uiDistDir));
app.use(express.static(legacyPublicDir));

app.get("/login.html", (_req, res) => {
  if (hasUiBuild() && existsSync(uiLoginFile)) {
    res.sendFile(uiLoginFile);
    return;
  }
  res.sendFile(resolve(legacyPublicDir, "login.html"));
});

// SPA fallback — serve index.html for all non-API, non-preview, non-asset routes
app.get(/^\/(?!api\/|preview-site\/|_astro\/|@vite\/|@fs\/|node_modules\/|images\/|favicon\.svg).*/, (_req, res) => {
  if (hasUiBuild()) {
    res.sendFile(uiIndexFile);
    return;
  }
  res.sendFile(resolve(legacyPublicDir, "index.html"));
});

// ── Auto-seed on first run ─────────────────────────────────
async function autoSeed() {
  const db = getDb();
  const { count } = db.query("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  if (count === 0) {
    console.log("No users found — running auto-seed...");
    const { hashPassword } = await import("./auth/passwords.js");
    const hashed = await hashPassword(config.adminPassword);
    db.query("INSERT INTO users (email, name, password) VALUES (?, ?, ?)").run(
      config.adminEmail,
      config.adminName,
      hashed
    );
    console.log(`Admin user created: ${config.adminEmail}`);
  }
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
  await autoSeed();
  app.listen(config.port, config.host, () => {
    console.log(`\nBebras CMS running at http://${config.host}:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Content dir: ${config.contentDir}`);
    console.log(`Landing dir: ${config.landingDir}\n`);
  });
}

boot().catch((err) => {
  console.error("Failed to start CMS:", err);
  process.exit(1);
});

export default app;
