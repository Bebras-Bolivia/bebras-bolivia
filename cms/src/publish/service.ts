import { readdir, cp, mkdir, readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve as resolvePath } from "path";
import { execFile } from "child_process";
import { config } from "../config.js";
import { getDb, type PublishLogRow, type ScheduledPublishRow } from "../db/index.js";
import { createSnapshot } from "../snapshots/service.js";
import { isDevServerRunning, stopDevServer, startDevServer } from "../preview/service.js";
import { preserveDiacritics } from "../content/preserve-text.js";
import { CONTENT_FILES } from "../content/schemas.js";
import { copyUtf8TextFile } from "../lib/utf8-files.js";

// Publish lock — reject concurrent publishes
let isPublishing = false;
const scheduledTimers = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_TIMEOUT_MS = 2_147_483_647;

export interface PublishStatus {
  isPublishing: boolean;
  lastPublish: PublishLogRow | null;
}

export type PublishChangeStatus = "added" | "modified" | "deleted";
export type PublishChangeType = "content" | "blog";

export interface PublishChangeItem {
  type: PublishChangeType;
  file: string;
  label: string;
  status: PublishChangeStatus;
  changedPaths: string[];
  currentUpdatedAt: string | null;
  publishedUpdatedAt: string | null;
}

export interface PublishChangesSummary {
  total: number;
  content: number;
  blog: number;
  added: number;
  modified: number;
  deleted: number;
}

export interface PublishChanges {
  summary: PublishChangesSummary;
  items: PublishChangeItem[];
}

export interface PublishSchedule {
  active: ScheduledPublishRow | null;
  history: ScheduledPublishRow[];
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

export async function getUnpublishedChanges(): Promise<PublishChanges> {
  const contentItems = await compareKnownFiles({
    type: "content",
    files: CONTENT_FILES,
    currentDir: config.currentDataDir,
    publishedDir: config.landingDataDir,
  });
  const blogFiles = Array.from(new Set([
    ...(await listFiles(config.currentBlogDir, ".md")),
    ...(await listFiles(config.landingBlogDir, ".md")),
  ])).sort((a, b) => a.localeCompare(b, "es"));
  const blogItems = await compareKnownFiles({
    type: "blog",
    files: blogFiles,
    currentDir: config.currentBlogDir,
    publishedDir: config.landingBlogDir,
  });
  const items = [...contentItems, ...blogItems];

  return {
    summary: {
      total: items.length,
      content: items.filter((item) => item.type === "content").length,
      blog: items.filter((item) => item.type === "blog").length,
      added: items.filter((item) => item.status === "added").length,
      modified: items.filter((item) => item.status === "modified").length,
      deleted: items.filter((item) => item.status === "deleted").length,
    },
    items,
  };
}

export function getPublishSchedule(): PublishSchedule {
  const db = getDb();
  const active = db
    .query("SELECT * FROM scheduled_publishes WHERE status IN ('scheduled', 'running') ORDER BY run_at ASC LIMIT 1")
    .get() as ScheduledPublishRow | null;
  const history = db
    .query("SELECT * FROM scheduled_publishes ORDER BY datetime(run_at) DESC, id DESC LIMIT 12")
    .all() as ScheduledPublishRow[];

  return { active, history };
}

export function schedulePublish(runAt: string, author: string): ScheduledPublishRow {
  const date = new Date(runAt);
  if (Number.isNaN(date.getTime())) {
    throw new PublishError("Invalid publish date", 400);
  }

  if (date.getTime() <= Date.now() + 30_000) {
    throw new PublishError("Scheduled publish must be at least 30 seconds in the future", 400);
  }

  const db = getDb();
  const active = db
    .query("SELECT id FROM scheduled_publishes WHERE status IN ('scheduled', 'running') LIMIT 1")
    .get() as { id: number } | null;
  if (active) {
    throw new PublishError("A publish is already scheduled", 409);
  }

  const result = db
    .query("INSERT INTO scheduled_publishes (run_at, author) VALUES (?, ?)")
    .run(date.toISOString(), author);
  const row = db
    .query("SELECT * FROM scheduled_publishes WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as ScheduledPublishRow;
  armScheduledPublish(row);
  return row;
}

export function cancelScheduledPublish(id: number): ScheduledPublishRow {
  const db = getDb();
  const row = db
    .query("SELECT * FROM scheduled_publishes WHERE id = ?")
    .get(id) as ScheduledPublishRow | null;
  if (!row) throw new PublishError("Scheduled publish not found", 404);
  if (row.status !== "scheduled") throw new PublishError("Only scheduled publishes can be cancelled", 409);

  clearScheduledTimer(id);
  db.query("UPDATE scheduled_publishes SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
  return db.query("SELECT * FROM scheduled_publishes WHERE id = ?").get(id) as ScheduledPublishRow;
}

export function initializePublishScheduler(): void {
  const db = getDb();
  const rows = db
    .query("SELECT * FROM scheduled_publishes WHERE status = 'scheduled' ORDER BY run_at ASC")
    .all() as ScheduledPublishRow[];
  rows.forEach(armScheduledPublish);
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
  // Atomic check-and-set: synchronous, no `await` between the check and the
  // assignment, so concurrent requests cannot both pass the guard.
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
    for (const file of CONTENT_FILES) {
      if (existsSync(join(config.currentDataDir, file))) {
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
        await copyUtf8TextFile(
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

type CompareFilesOptions = {
  type: PublishChangeType;
  files: string[];
  currentDir: string;
  publishedDir: string;
};

async function compareKnownFiles(options: CompareFilesOptions): Promise<PublishChangeItem[]> {
  const items: PublishChangeItem[] = [];

  for (const file of options.files) {
    const currentPath = join(options.currentDir, file);
    const publishedPath = join(options.publishedDir, file);
    const [current, published] = await Promise.all([
      readOptionalTextFile(currentPath),
      readOptionalTextFile(publishedPath),
    ]);

    if (current.content === null && published.content === null) continue;

    const status: PublishChangeStatus = current.content === null
      ? "deleted"
      : published.content === null
        ? "added"
        : "modified";
    const changedPaths = describeChangedPaths(options.type, current.content, published.content);
    if (current.content === published.content || (status === "modified" && changedPaths.length === 0)) continue;

    items.push({
      type: options.type,
      file,
      label: labelForFile(options.type, file),
      status,
      changedPaths,
      currentUpdatedAt: current.updatedAt,
      publishedUpdatedAt: published.updatedAt,
    });
  }

  return items;
}

async function listFiles(dir: string, extension: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((file) => file.endsWith(extension)).sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return [];
  }
}

async function readOptionalTextFile(filePath: string): Promise<{ content: string | null; updatedAt: string | null }> {
  try {
    const [content, info] = await Promise.all([readFile(filePath, "utf-8"), stat(filePath)]);
    return { content, updatedAt: info.mtime.toISOString() };
  } catch {
    return { content: null, updatedAt: null };
  }
}

function describeChangedPaths(type: PublishChangeType, current: string | null, published: string | null): string[] {
  if (current === null) return ["Archivo eliminado"];
  if (published === null) return ["Archivo nuevo"];
  if (type === "blog") return describeMarkdownChanges(current, published);

  try {
    return diffJsonPaths(JSON.parse(published), JSON.parse(current)).slice(0, 8);
  } catch {
    return ["Contenido del archivo"];
  }
}

function diffJsonPaths(previous: unknown, next: unknown, path = ""): string[] {
  if (Object.is(previous, next)) return [];
  const displayPath = path || "Todo el archivo";

  if (!isRecord(previous) || !isRecord(next)) {
    if (Array.isArray(previous) && Array.isArray(next)) {
      return diffArrays(previous, next, path);
    }
    return [displayPath];
  }

  const keys = Array.from(new Set([...Object.keys(previous), ...Object.keys(next)])).sort((a, b) => a.localeCompare(b, "es"));
  return keys.flatMap((key) => {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in previous)) return [`${childPath} agregado`];
    if (!(key in next)) return [`${childPath} eliminado`];
    return diffJsonPaths(previous[key], next[key], childPath);
  });
}

function diffArrays(previous: unknown[], next: unknown[], path: string): string[] {
  if (previous.length !== next.length) return [`${path || "Lista"} (${previous.length} -> ${next.length})`];
  for (let i = 0; i < previous.length; i += 1) {
    if (!Object.is(JSON.stringify(previous[i]), JSON.stringify(next[i]))) {
      return [`${path || "Lista"}[${i}]`];
    }
  }
  return [];
}

function describeMarkdownChanges(current: string, published: string): string[] {
  const changes: string[] = [];
  const currentTitle = current.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
  const publishedTitle = published.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
  if (currentTitle !== publishedTitle) changes.push("Título");
  const currentDescription = current.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
  const publishedDescription = published.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
  if (currentDescription !== publishedDescription) changes.push("Descripción");
  if (stripFrontmatter(current) !== stripFrontmatter(published)) changes.push("Contenido");
  return changes.length ? changes : ["Metadatos"];
}

function stripFrontmatter(value: string): string {
  return value.replace(/^---[\s\S]*?---\s*/, "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function labelForFile(type: PublishChangeType, file: string): string {
  if (type === "blog") return file.replace(/\.md$/, "");
  return file.replace(/\.json$/, "");
}

function armScheduledPublish(row: ScheduledPublishRow): void {
  clearScheduledTimer(row.id);
  const delay = Math.max(0, new Date(row.run_at).getTime() - Date.now());
  const timer = setTimeout(() => {
    if (delay > MAX_TIMEOUT_MS) {
      armScheduledPublish(row);
      return;
    }
    runScheduledPublish(row.id).catch((err) => console.error("Scheduled publish failed:", err));
  }, Math.min(delay, MAX_TIMEOUT_MS));
  scheduledTimers.set(row.id, timer);
}

function clearScheduledTimer(id: number): void {
  const timer = scheduledTimers.get(id);
  if (timer) clearTimeout(timer);
  scheduledTimers.delete(id);
}

async function runScheduledPublish(id: number): Promise<void> {
  clearScheduledTimer(id);
  const db = getDb();
  const row = db.query("SELECT * FROM scheduled_publishes WHERE id = ?").get(id) as ScheduledPublishRow | null;
  if (!row || row.status !== "scheduled") return;

  db.query("UPDATE scheduled_publishes SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(id);
  try {
    const result = await publish(row.author);
    db.query(
      "UPDATE scheduled_publishes SET status = 'completed', publish_log_id = ?, output = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(result.id, "Publicación completada", id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.query(
      "UPDATE scheduled_publishes SET status = 'failed', output = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(message, id);
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

    // execFile (no shell) avoids command-injection if the cwd or args ever
    // become user-controlled in the future.
    execFile(
      buildCmd,
      args,
      {
        cwd: config.landingDir,
        timeout: 120_000,
        env: { ...process.env },
        shell: false,
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
