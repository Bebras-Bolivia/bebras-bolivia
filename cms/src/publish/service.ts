import { readdir, cp, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve as resolvePath } from "path";
import { execFile } from "child_process";
import { config } from "../config.js";
import { getDb, type PublishLogRow } from "../db/index.js";
import { createSnapshot } from "../snapshots/service.js";
import { isDevServerRunning, stopDevServer, startDevServer } from "../preview/service.js";
import { preserveDiacritics } from "../content/preserve-text.js";

// Publish lock — reject concurrent publishes
let isPublishing = false;

export interface PublishStatus {
  isPublishing: boolean;
  lastPublish: PublishLogRow | null;
}

/**
 * Get the current publish status.
 */
export function getPublishStatus(): PublishStatus {
  const db = getDb();
  const last = db
    .query("SELECT * FROM publish_log ORDER BY id DESC LIMIT 1")
    .get() as PublishLogRow | null;

  return { isPublishing, lastPublish: last };
}

/**
 * Execute the full publish flow:
 * 1. Lock
 * 2. Create snapshot
 * 3. Copy JSON to landing/src/data/
 * 4. Copy blog MD to landing/src/content/blog/
 * 5. Copy media to landing/public/images/uploads/
 * 6. Run astro build
 * 7. Unlock
 */
export async function publish(author: string): Promise<PublishLogRow> {
  if (isPublishing) {
    throw new PublishError("A publish is already in progress", 409);
  }

  isPublishing = true;
  const db = getDb();

  // Stop the Astro dev server if running — can't run build and dev simultaneously
  const wasDevServerRunning = isDevServerRunning();
  if (wasDevServerRunning) {
    console.log("[Publish] Stopping dev server for build...");
    stopDevServer();
    // Give it a moment to release file handles
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Create publish log entry
  const logResult = db
    .query("INSERT INTO publish_log (status, output) VALUES ('running', '')")
    .run();
  const logId = Number(logResult.lastInsertRowid);

  try {
    // Step 1: Create snapshot
    await createSnapshot("Auto-snapshot before publish", author);

    // Step 2: Copy JSON files to landing/src/data/
    await mkdir(config.landingDataDir, { recursive: true });
    const dataFiles = await readdir(config.currentDataDir);
    for (const file of dataFiles) {
      if (file.endsWith(".json")) {
        await copyJsonPreservingDiacritics(
          join(config.currentDataDir, file),
          join(config.landingDataDir, file)
        );
      }
    }

    // Step 3: Copy blog MD files to landing/src/content/blog/
    await mkdir(config.landingBlogDir, { recursive: true });
    const blogFiles = await readdir(config.currentBlogDir);
    for (const file of blogFiles) {
      if (file.endsWith(".md")) {
        await cp(
          join(config.currentBlogDir, file),
          join(config.landingBlogDir, file)
        );
      }
    }

    // Step 4: Copy media files to landing/public/images/uploads/
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

    // Step 5: Run astro build
    const buildOutput = await runBuild();

    // Success
    db.query(
      "UPDATE publish_log SET status = 'success', output = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(buildOutput, logId);

    const row = db
      .query("SELECT * FROM publish_log WHERE id = ?")
      .get(logId) as PublishLogRow;

    return row;
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error during publish";

    db.query(
      "UPDATE publish_log SET status = 'failed', output = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(errorMsg, logId);

    const row = db
      .query("SELECT * FROM publish_log WHERE id = ?")
      .get(logId) as PublishLogRow;

    throw new PublishError(`Publish failed: ${errorMsg}`, 500);
  } finally {
    isPublishing = false;

    // Restart the dev server if it was running before publish
    if (wasDevServerRunning) {
      console.log("[Publish] Restarting dev server...");
      startDevServer().catch((err) => {
        console.error("[Publish] Failed to restart dev server:", err);
      });
    }
  }
}

async function copyJsonPreservingDiacritics(sourcePath: string, targetPath: string): Promise<void> {
  const data = JSON.parse(await readFile(sourcePath, "utf-8"));
  let referenceData: unknown = null;

  try {
    referenceData = JSON.parse(await readFile(targetPath, "utf-8"));
  } catch {
    // No target yet; write source as-is.
  }

  await writeFile(targetPath, JSON.stringify(preserveDiacritics(data, referenceData), null, 2) + "\n", "utf-8");
}

/**
 * Run Astro directly. `bun run build` may invoke Astro through the system Node,
 * which can be too old on production servers.
 * Returns the combined stdout+stderr output.
 */
function runBuild(): Promise<string> {
  return new Promise((resolve, reject) => {
    const isBun = Boolean((process.versions as Record<string, string | undefined>).bun);
    const localAstro = resolvePath(
      config.landingDir,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "astro.cmd" : "astro"
    );
    const canRunAstroDirectly = existsSync(localAstro);
    const buildCmd = canRunAstroDirectly
      ? process.platform === "win32"
        ? localAstro
        : isBun
          ? process.execPath
          : localAstro
      : process.platform === "win32"
        ? "npm.cmd"
        : "npm";
    const args = canRunAstroDirectly
      ? process.platform === "win32" || !isBun
        ? ["build"]
        : [localAstro, "build"]
      : ["run", "build"];

    execFile(
      buildCmd,
      args,
      {
        cwd: config.landingDir,
        timeout: 120_000, // 120 second timeout
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const output = `${stdout}\n${stderr}`.trim();
        if (error) {
          reject(new Error(`Build failed:\n${output}`));
        } else {
          resolve(output);
        }
      }
    );
  });
}

export class PublishError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PublishError";
    this.status = status;
  }
}
