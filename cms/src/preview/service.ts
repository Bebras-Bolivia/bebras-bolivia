import { readdir, cp, mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { spawn, type ChildProcess } from "child_process";
import { config } from "../config.js";
import { createServer } from "net";
import { contentSchemas, CONTENT_FILES } from "../content/schemas.js";
import { preserveDiacritics } from "../content/preserve-text.js";

// ── Dev Server State ──────────────────────────────────────
let devProcess: ChildProcess | null = null;
let devServerReady = false;
let devServerStarting = false;
let devServerError: string | null = null;
let devServerPort = 4322;

export interface PreviewStatus {
  running: boolean;
  starting: boolean;
  port: number;
  error: string | null;
}

export function getPreviewStatus(): PreviewStatus {
  return {
    running: devServerReady,
    starting: devServerStarting,
    port: devServerPort,
    error: devServerError,
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

/**
 * Start the Astro dev server as a persistent child process.
 * Returns once the server is ready (detected via stdout).
 */
export async function startDevServer(): Promise<{ ok: true; port: number }> {
  // Already running
  if (devProcess && devServerReady) {
    return { ok: true, port: devServerPort };
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

  // Find a free port so Astro doesn't prompt/hang
  devServerPort = await getFreePort(4322);

  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";

    devProcess = spawn(cmd, ["astro", "dev", "--port", String(devServerPort)], {
      cwd: config.landingDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "" },
      shell: process.platform === "win32",
    });

    let startupOutput = "";
    const timeout = setTimeout(() => {
      if (!devServerReady) {
        devServerStarting = false;
        devServerError = `Dev server timed out after 30s. Output:\n${startupOutput}`;
        reject(new PreviewError(devServerError, 500));
      }
    }, 30_000);

    devProcess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      startupOutput += text;

      // Astro prints "localhost:PORT" when ready
      if (text.includes(`localhost:${devServerPort}`) || text.includes("Local")) {
        if (!devServerReady) {
          devServerReady = true;
          devServerStarting = false;
          devServerError = null;
          clearTimeout(timeout);
          console.log(`[Preview] Astro dev server ready on port ${devServerPort}`);
          resolve({ ok: true, port: devServerPort });
        }
      }
    });

    devProcess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      startupOutput += text;
      // Astro dev logs some info to stderr too — check for ready signal
      if (text.includes(`localhost:${devServerPort}`) || text.includes("Local")) {
        if (!devServerReady) {
          devServerReady = true;
          devServerStarting = false;
          devServerError = null;
          clearTimeout(timeout);
          console.log(`[Preview] Astro dev server ready on port ${devServerPort}`);
          resolve({ ok: true, port: devServerPort });
        }
      }
    });

    devProcess.on("error", (err) => {
      clearTimeout(timeout);
      devServerReady = false;
      devServerStarting = false;
      devServerError = err.message;
      devProcess = null;
      console.error("[Preview] Dev server process error:", err.message);
      reject(new PreviewError(`Failed to start dev server: ${err.message}`, 500));
    });

    devProcess.on("exit", (code, signal) => {
      clearTimeout(timeout);
      const wasReady = devServerReady;
      devServerReady = false;
      devServerStarting = false;
      devProcess = null;

      if (!wasReady) {
        devServerError = `Dev server exited (code ${code}, signal ${signal}) before ready.\n${startupOutput}`;
        reject(new PreviewError(devServerError, 500));
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
function waitForReady(): Promise<{ ok: true; port: number }> {
  return new Promise((resolve, reject) => {
    const maxWait = 30_000;
    const interval = 200;
    let elapsed = 0;

    const check = setInterval(() => {
      elapsed += interval;
      if (devServerReady) {
        clearInterval(check);
        resolve({ ok: true, port: devServerPort });
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
    const dataFiles = await readdir(config.currentDataDir);
    for (const file of dataFiles) {
      if (file.endsWith(".json")) {
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
  return `http://localhost:${devServerPort}`;
}

export class PreviewError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PreviewError";
    this.status = status;
  }
}
