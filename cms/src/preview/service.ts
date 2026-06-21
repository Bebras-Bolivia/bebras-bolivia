import { readdir, cp, mkdir, writeFile, readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { spawn, type ChildProcess } from "child_process";
import matter from "gray-matter";
import { config } from "../config.js";
import { createServer } from "net";
import { contentSchemas, CONTENT_FILES } from "../content/schemas.js";
import { preserveDiacritics } from "../content/preserve-text.js";
import { blogFrontmatterSchema, formatFrontmatter } from "../blog/service.js";

// ── Dev Server State ──────────────────────────────────────
let devProcess: ChildProcess | null = null;
let devServerReady = false;
let devServerStarting = false;
let devServerError: string | null = null;
let devServerPort = 4322;
const BLOG_PREVIEW_SLUG = "cms-preview";

export function getBlogPreviewSlug(): string {
  return BLOG_PREVIEW_SLUG;
}

export interface PreviewStatus {
  running: boolean;
  starting: boolean;
  port: number;
  error: string | null;
  mode: "dev" | "static";
}

type StartPreviewResult = { ok: true; port: number; mode: "dev" } | { ok: true; port: null; mode: "static" };
type AstroCommand = { cmd: string; argsPrefix: string[] };

export function getPreviewStatus(): PreviewStatus {
  return {
    running: devServerReady,
    starting: devServerStarting,
    port: devServerPort,
    error: devServerError,
    mode: devServerReady ? "dev" : "static",
  };
}

/**
 * Helper to dynamically find a free port.
 */
async function getFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      const fbServer = createServer();
      fbServer.listen(0, () => {
        const port = (fbServer.address() as any).port;
        fbServer.close(() => resolve(port));
      });
      fbServer.on("error", () => resolve(startPort + 1));
    });
  });
}

function getAstroCommand(): AstroCommand | null {
  if (process.env.ASTRO_BIN) return { cmd: process.env.ASTRO_BIN, argsPrefix: [] };

  const localAstro = resolve(
    config.landingDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "astro.cmd" : "astro"
  );

  if (existsSync(localAstro)) {
    return process.platform === "win32"
      ? { cmd: localAstro, argsPrefix: [] }
      : { cmd: process.execPath, argsPrefix: [localAstro] };
  }

  const localNpx = resolve(
    config.landingDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "npx.cmd" : "npx"
  );

  if (existsSync(localNpx)) return { cmd: localNpx, argsPrefix: ["astro"] };

  return { cmd: process.platform === "win32" ? "npx.cmd" : "npx", argsPrefix: ["astro"] };
}

function fallbackToStaticPreview(reason: string): StartPreviewResult {
  console.warn(`[Preview] ${reason}; using static preview fallback.`);
  devServerReady = false;
  devServerStarting = false;
  devServerError = null;
  devProcess = null;
  return { ok: true, port: null, mode: "static" };
}

/**
 * Start the Astro dev server as a persistent child process.
 * Returns once the server is ready (detected via stdout).
 */
export async function startDevServer(): Promise<StartPreviewResult> {
  // Already running
  if (devProcess && devServerReady) {
    return { ok: true, port: devServerPort, mode: "dev" };
  }

  // Already starting — wait for it
  if (devServerStarting) {
    return waitForReady();
  }

  devServerStarting = true;
  devServerReady = false;
  devServerError = null;

  // First, sync content to landing so the dev server has current data
  await syncContentToLanding();

  const command = getAstroCommand();
  if (!command) {
    return fallbackToStaticPreview("Astro executable not found");
  }

  // Find a free port so Astro doesn't prompt/hang
  devServerPort = await getFreePort(4322);

  return new Promise((resolve, reject) => {
    // Bind to 127.0.0.1 explicitly. Without --host, Astro may listen only on
    // IPv6 ([::1]); the proxy fetches http://localhost:<port>, which on Windows
    // often resolves to IPv4 (127.0.0.1) first and then fails, silently falling
    // back to the stale static dist/ — making the live preview never update.
    const args = [...command.argsPrefix, "dev", "--host", "127.0.0.1", "--port", String(devServerPort)];

    devProcess = spawn(command.cmd, args, {
      cwd: config.landingDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "" },
      shell: process.platform === "win32",
    });

    let startupOutput = "";
    let resolvedReady = false;
    const timeout = setTimeout(() => {
      if (!devServerReady) {
        const message = `Dev server timed out after 30s. Output:\n${startupOutput}`;
        if (config.isDev) {
          devServerStarting = false;
          devServerError = message;
          reject(new PreviewError(devServerError, 500));
          return;
        }
        resolve(fallbackToStaticPreview(message));
      }
    }, 30_000);

    // Astro v5 prints a "Local: http://127.0.0.1:<port>/" line once the server
    // is actually listening. We DON'T assume the port we requested: if it was
    // taken, Astro logs "Port <n> is in use, trying another one..." and binds a
    // different port. So we read the actual port from the ready URL and update
    // devServerPort, otherwise the proxy would target the wrong port forever.
    const readyPattern = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\b/;

    const markReady = (actualPort: number) => {
      if (devServerReady) return;
      devServerPort = actualPort;
      devServerReady = true;
      devServerStarting = false;
      devServerError = null;
      clearTimeout(timeout);
      console.log(`[Preview] Astro dev server ready on port ${devServerPort}`);
      resolvedReady = true;
      resolve({ ok: true, port: devServerPort, mode: "dev" });
    };

    const scanForReady = (text: string) => {
      const match = readyPattern.exec(text);
      if (match) markReady(Number(match[1]));
    };

    devProcess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      startupOutput += text;
      scanForReady(text);
    });

    devProcess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      startupOutput += text;
      scanForReady(text);
    });

    devProcess.on("error", (err) => {
      clearTimeout(timeout);
      devServerReady = false;
      devServerStarting = false;
      devServerError = err.message;
      devProcess = null;
      console.error("[Preview] Dev server process error:", err.message);
      if (config.isDev) {
        reject(new PreviewError(`Failed to start dev server: ${err.message}`, 500));
        return;
      }
      resolve(fallbackToStaticPreview(`Failed to start dev server: ${err.message}`));
    });

    devProcess.on("exit", (code, signal) => {
      clearTimeout(timeout);
      const wasReady = resolvedReady || devServerReady;
      devServerReady = false;
      devServerStarting = false;
      devProcess = null;

      if (!wasReady) {
        const message = `Dev server exited (code ${code}, signal ${signal}) before ready.\n${startupOutput}`;
        if (config.isDev) {
          devServerError = message;
          reject(new PreviewError(devServerError, 500));
          return;
        }
        resolve(fallbackToStaticPreview(message));
      } else {
        console.log(`[Preview] Dev server exited (code ${code}, signal ${signal})`);
        devServerError = `Dev server exited unexpectedly (code ${code})`;
      }
    });
  });
}

/**
 * Wait for an already-starting server to become ready.
 */
function waitForReady(): Promise<StartPreviewResult> {
  return new Promise((resolve, reject) => {
    const maxWait = 30_000;
    const interval = 200;
    let elapsed = 0;

    const check = setInterval(() => {
      elapsed += interval;
      if (devServerReady) {
        clearInterval(check);
        resolve({ ok: true, port: devServerPort, mode: "dev" });
      } else if (!devServerStarting || elapsed >= maxWait) {
        clearInterval(check);
        reject(
          new PreviewError(
            devServerError || "Dev server failed to start",
            500
          )
        );
      }
    }, interval);
  });
}

/**
 * Stop the Astro dev server.
 */
export function stopDevServer(): { ok: true } {
  if (devProcess) {
    console.log("[Preview] Stopping Astro dev server...");
    // On Windows, spawn with shell=true requires killing the tree
    if (process.platform === "win32" && devProcess.pid) {
      try {
        // taskkill /T kills the process tree
        spawn("taskkill", ["/pid", String(devProcess.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } catch {
        devProcess.kill("SIGTERM");
      }
    } else {
      devProcess.kill("SIGTERM");
    }
    devProcess = null;
    devServerReady = false;
    devServerStarting = false;
    devServerError = null;
  }
  return { ok: true };
}

/**
 * Sync current CMS content to the landing directory.
 * This ensures the dev server has the latest data.
 */
export async function syncContentToLanding(): Promise<void> {
  // Copy JSON files
  await mkdir(config.landingDataDir, { recursive: true });
  try {
    for (const file of CONTENT_FILES) {
      if (existsSync(join(config.currentDataDir, file))) {
        await cp(
          join(config.currentDataDir, file),
          join(config.landingDataDir, file)
        );
      }
    }
  } catch {
    // No data files yet — fine
  }

  // Copy blog files
  await mkdir(config.landingBlogDir, { recursive: true });
  try {
    const blogFiles = await readdir(config.currentBlogDir);
    for (const file of blogFiles) {
      if (file.endsWith(".md")) {
        await cp(
          join(config.currentBlogDir, file),
          join(config.landingBlogDir, file)
        );
      }
    }
  } catch {
    // No blog files yet — fine
  }

  // Copy media files
  const uploadsDir = join(config.landingPublicDir, "images", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  try {
    const mediaFiles = await readdir(config.mediaDir);
    for (const file of mediaFiles) {
      await cp(join(config.mediaDir, file), join(uploadsDir, file));
    }
  } catch {
    // No media files — fine
  }
}

/**
 * Sync a single content file to landing (called after save for HMR).
 */
export async function syncFileToLanding(filename: string): Promise<void> {
  await mkdir(config.landingDataDir, { recursive: true });
  const src = join(config.currentDataDir, filename);
  const dest = join(config.landingDataDir, filename);
  const data = JSON.parse(await readFile(src, "utf-8"));
  const referenceData = await readJsonIfExists(dest);
  await writeFile(dest, JSON.stringify(preserveDiacritics(data, referenceData), null, 2) + "\n", "utf-8");
}

/**
 * Sync an unsaved draft directly to landing preview data.
 * This does not persist into the CMS current content directory.
 */
export async function syncDraftToLanding(
  filename: string,
  data: unknown
): Promise<void> {
  if (!CONTENT_FILES.includes(filename)) {
    throw new PreviewError(`Unknown content file: ${filename}`, 404);
  }

  const dest = join(config.landingDataDir, filename);
  const referenceData = await readJsonIfExists(dest);
  const schema = contentSchemas[filename];
  const result = schema.safeParse(preserveDiacritics(data, referenceData));
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new PreviewError(`Draft validation failed: ${details}`, 400);
  }

  await mkdir(config.landingDataDir, { recursive: true });
  await writeFile(dest, JSON.stringify(result.data, null, 2) + "\n", "utf-8");
}

export async function syncBlogDraftToLanding(
  slug: string,
  frontmatter: unknown,
  body: string,
  usePreviewSlug = false
): Promise<string> {
  const resolvedSlug = usePreviewSlug ? BLOG_PREVIEW_SLUG : slug;
  if (!resolvedSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
    throw new PreviewError("Invalid blog slug for preview", 400);
  }

  const normalized = blogFrontmatterSchema.safeParse({
    title: typeof (frontmatter as any)?.title === "string" && (frontmatter as any).title.trim()
      ? (frontmatter as any).title.trim()
      : "Vista previa",
    description: typeof (frontmatter as any)?.description === "string" && (frontmatter as any).description.trim()
      ? (frontmatter as any).description.trim()
      : "Borrador en vista previa del CMS.",
    date: (frontmatter as any)?.date || new Date().toISOString().split("T")[0],
    author: typeof (frontmatter as any)?.author === "string" && (frontmatter as any).author.trim()
      ? (frontmatter as any).author.trim()
      : "Bebras Bolivia",
    image: typeof (frontmatter as any)?.image === "string" && (frontmatter as any).image.trim()
      ? (frontmatter as any).image.trim()
      : undefined,
  });

  if (!normalized.success) {
    const details = normalized.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new PreviewError(`Blog draft validation failed: ${details}`, 400);
  }

  await mkdir(config.landingBlogDir, { recursive: true });
  const dest = join(config.landingBlogDir, `${resolvedSlug}.md`);
  const content = matter.stringify(String(body || "") + "\n", formatFrontmatter(normalized.data));
  await writeFile(dest, content, "utf-8");

  return resolvedSlug;
}

export async function cleanupBlogDraftPreview(): Promise<void> {
  try {
    await rm(join(config.landingBlogDir, `${BLOG_PREVIEW_SLUG}.md`));
  } catch {
    // Missing preview file is fine.
  }
}

async function readJsonIfExists(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Check if the dev server is currently running and ready.
 */
export function isDevServerRunning(): boolean {
  return devServerReady && devProcess !== null;
}

/**
 * Get the dev server base URL for proxying.
 */
export function getDevServerUrl(): string {
  // Use 127.0.0.1 (not "localhost") to match the dev server's --host bind and
  // avoid IPv4/IPv6 resolution mismatches that break the preview proxy.
  return `http://127.0.0.1:${devServerPort}`;
}

export class PreviewError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PreviewError";
    this.status = status;
  }
}
