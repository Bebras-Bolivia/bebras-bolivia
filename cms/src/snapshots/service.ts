import { access, readdir, mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { gzipSync, gunzipSync } from "zlib";
import { config } from "../config.js";
import { getDb, type SnapshotRow } from "../db/index.js";
import { copyUtf8TextFile } from "../lib/utf8-files.js";
import { withContentMutation } from "../content/mutation-lock.js";

export interface SnapshotMeta {
  id: number;
  description: string;
  author: string;
  dirName: string;
  createdAt: string;
}

type SnapshotArchive = {
  format: "bebras-cms-snapshot";
  version: 1;
  exportedAt: string;
  meta: SnapshotMeta;
  files: {
    data: Record<string, string>;
    blog: Record<string, string>;
  };
};

const BLOG_PREVIEW_FILENAME = "cms-preview.md";

function isSnapshotBlogFile(file: string): boolean {
  return file.endsWith(".md") && file !== BLOG_PREVIEW_FILENAME;
}

function isJsonFile(file: string): boolean {
  return file.endsWith(".json");
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isFileNotFoundError(error)) return false;
    throw error;
  }
}

async function copyMatchingTextFiles(
  sourceDir: string,
  targetDir: string,
  predicate: (file: string) => boolean,
  allowMissingSource = false
): Promise<void> {
  await mkdir(targetDir, { recursive: true });

  let files: string[];
  try {
    files = (await readdir(sourceDir)).filter(predicate);
  } catch (error) {
    if (allowMissingSource && isFileNotFoundError(error)) return;
    throw error;
  }

  for (const file of files) {
    await copyUtf8TextFile(join(sourceDir, file), join(targetDir, file));
  }
}

async function validateSnapshotFiles(snapshotDir: string): Promise<void> {
  const dataDir = join(snapshotDir, "data");
  const blogDir = join(snapshotDir, "blog");
  const [dataFiles, blogFiles] = await Promise.all([
    readdir(dataDir),
    readdir(blogDir),
  ]);

  for (const file of dataFiles.filter(isJsonFile)) {
    JSON.parse(await readFile(join(dataDir, file), "utf-8"));
  }
  for (const file of blogFiles.filter(isSnapshotBlogFile)) {
    await readFile(join(blogDir, file), "utf-8");
  }
}

async function registerPreparedSnapshot(
  temporaryDir: string,
  snapshotDir: string,
  meta: SnapshotMeta
): Promise<void> {
  await writeFile(
    join(temporaryDir, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf-8"
  );
  await validateSnapshotFiles(temporaryDir);
  await rename(temporaryDir, snapshotDir);

  try {
    getDb()
      .query("INSERT INTO snapshots (id, description, author, dir_name) VALUES (?, ?, ?, ?)")
      .run(meta.id, meta.description, meta.author, meta.dirName);
  } catch (error) {
    await rm(snapshotDir, { recursive: true, force: true });
    throw error;
  }
}

class RestoreSwapError extends Error {
  constructor(message: string, readonly keepRecoveryFiles: boolean) {
    super(message);
    this.name = "RestoreSwapError";
  }
}

async function readSnapshotMetaFromDisk(dirName: string): Promise<SnapshotMeta | null> {
  try {
    const meta = JSON.parse(await readFile(join(config.snapshotsDir, dirName, "meta.json"), "utf-8")) as Partial<SnapshotMeta>;
    const idMatch = /^snapshot-(\d+)$/.exec(dirName);
    const id = typeof meta.id === "number" ? meta.id : idMatch ? Number(idMatch[1]) : NaN;
    if (!Number.isFinite(id)) return null;

    return {
      id,
      description: typeof meta.description === "string" ? meta.description : "",
      author: typeof meta.author === "string" ? meta.author : "Unknown",
      dirName,
      createdAt: typeof meta.createdAt === "string" ? meta.createdAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function listSnapshotMetasFromDisk(): Promise<SnapshotMeta[]> {
  try {
    const entries = await readdir(config.snapshotsDir, { withFileTypes: true });
    const metas = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && /^snapshot-\d+$/.test(entry.name))
        .map((entry) => readSnapshotMetaFromDisk(entry.name))
    );
    return metas.filter((meta): meta is SnapshotMeta => meta !== null);
  } catch {
    return [];
  }
}

async function nextSnapshotId(): Promise<number> {
  const db = getDb();
  const row = db.query("SELECT MAX(id) AS maxId FROM snapshots").get() as { maxId: number | null } | null;
  const diskMax = (await listSnapshotMetasFromDisk()).reduce((max, snapshot) => Math.max(max, snapshot.id), 0);
  return Math.max(Number(row?.maxId ?? 0), diskMax) + 1;
}

/**
 * Create a snapshot of the current content state.
 * Copies all data/ and blog/ files into a numbered snapshot directory.
 */
export function createSnapshot(
  description: string,
  author: string
): Promise<SnapshotMeta> {
  return withContentMutation(() => createSnapshotUnlocked(description, author));
}

async function createSnapshotUnlocked(
  description: string,
  author: string
): Promise<SnapshotMeta> {
  const id = await nextSnapshotId();
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;
  const snapshotDir = join(config.snapshotsDir, dirName);
  const temporaryDir = join(
    config.snapshotsDir,
    `.${dirName}.tmp-${process.pid}-${Date.now()}`
  );
  const meta: SnapshotMeta = {
    id,
    description,
    author,
    dirName,
    createdAt: new Date().toISOString(),
  };

  await mkdir(config.snapshotsDir, { recursive: true });
  await rm(temporaryDir, { recursive: true, force: true });
  try {
    await Promise.all([
      copyMatchingTextFiles(
        config.currentDataDir,
        join(temporaryDir, "data"),
        isJsonFile,
        true
      ),
      copyMatchingTextFiles(
        config.currentBlogDir,
        join(temporaryDir, "blog"),
        isSnapshotBlogFile,
        true
      ),
    ]);
    await registerPreparedSnapshot(temporaryDir, snapshotDir, meta);
    return meta;
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

/**
 * List all snapshots (from DB, most recent first).
 */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const db = getDb();
  const rows = db
    .query("SELECT * FROM snapshots ORDER BY id DESC")
    .all() as SnapshotRow[];

  const diskSnapshots = await listSnapshotMetasFromDisk();
  const rowsByDirName = new Map(rows.map((row) => [row.dir_name, row]));
  const snapshots = diskSnapshots.map((snapshot) => {
    const row = rowsByDirName.get(snapshot.dirName);
    if (!row) return snapshot;

    return {
      ...snapshot,
      description: row.description || snapshot.description,
      author: row.author || snapshot.author,
      createdAt: row.created_at || snapshot.createdAt,
    };
  });

  return snapshots.sort((a, b) => b.id - a.id);
}

/**
 * Get a single snapshot's details + list of files.
 */
export async function getSnapshot(
  id: number
): Promise<SnapshotMeta & { files: { data: string[]; blog: string[] } }> {
  const db = getDb();
  const row = db
    .query("SELECT * FROM snapshots WHERE id = ?")
    .get(id) as SnapshotRow | null;

  const diskMeta = (await listSnapshotMetasFromDisk()).find((snapshot) => snapshot.id === id) ?? null;
  const meta = diskMeta ?? (row
    ? {
        id: row.id,
        description: row.description,
        author: row.author,
        dirName: row.dir_name,
        createdAt: row.created_at,
      }
    : null);

  if (!meta) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, meta.dirName);
  let dataFiles: string[] = [];
  let blogFiles: string[] = [];

  try {
    dataFiles = (await readdir(join(snapshotDir, "data"))).filter((f) =>
      f.endsWith(".json")
    );
  } catch {}
  try {
    blogFiles = (await readdir(join(snapshotDir, "blog"))).filter((f) =>
      f.endsWith(".md")
    );
  } catch {}

  return {
    id: meta.id,
    description: meta.description,
    author: meta.author,
    dirName: meta.dirName,
    createdAt: meta.createdAt,
    files: { data: dataFiles, blog: blogFiles },
  };
}

export async function exportSnapshotArchive(id: number): Promise<{ filename: string; buffer: Buffer }> {
  const snapshot = await getSnapshot(id);
  const snapshotDir = join(config.snapshotsDir, snapshot.dirName);
  const dataDir = join(snapshotDir, "data");
  const blogDir = join(snapshotDir, "blog");
  const archive: SnapshotArchive = {
    format: "bebras-cms-snapshot",
    version: 1,
    exportedAt: new Date().toISOString(),
    meta: {
      id: snapshot.id,
      description: snapshot.description,
      author: snapshot.author,
      dirName: snapshot.dirName,
      createdAt: snapshot.createdAt,
    },
    files: {
      data: {},
      blog: {},
    },
  };

  for (const file of snapshot.files.data) {
    archive.files.data[file] = await readFile(join(dataDir, file), "utf-8");
  }

  for (const file of snapshot.files.blog) {
    archive.files.blog[file] = await readFile(join(blogDir, file), "utf-8");
  }

  return {
    filename: `${snapshot.dirName}.bebras-snapshot.json.gz`,
    buffer: gzipSync(JSON.stringify(archive, null, 2)),
  };
}

export function importSnapshotArchive(buffer: Buffer, author: string): Promise<SnapshotMeta> {
  return withContentMutation(() => importSnapshotArchiveUnlocked(buffer, author));
}

async function importSnapshotArchiveUnlocked(buffer: Buffer, author: string): Promise<SnapshotMeta> {
  let archive: SnapshotArchive;
  try {
    archive = JSON.parse(gunzipSync(buffer).toString("utf-8")) as SnapshotArchive;
  } catch {
    throw new SnapshotError("Invalid snapshot archive", 400);
  }

  if (archive.format !== "bebras-cms-snapshot" || archive.version !== 1 || !archive.files) {
    throw new SnapshotError("Unsupported snapshot archive", 400);
  }

  validateArchiveFiles(archive.files.data, ".json");
  validateArchiveFiles(archive.files.blog, ".md");

  const description = archive.meta?.description
    ? `Importado: ${archive.meta.description}`
    : "Importado desde archivo";
  const id = await nextSnapshotId();
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;
  const snapshotDir = join(config.snapshotsDir, dirName);
  const temporaryDir = join(
    config.snapshotsDir,
    `.${dirName}.tmp-${process.pid}-${Date.now()}`
  );
  const meta: SnapshotMeta = {
    id,
    description,
    author,
    dirName,
    createdAt: new Date().toISOString(),
  };

  await mkdir(config.snapshotsDir, { recursive: true });
  await rm(temporaryDir, { recursive: true, force: true });
  try {
    const snapshotDataDir = join(temporaryDir, "data");
    const snapshotBlogDir = join(temporaryDir, "blog");
    await Promise.all([
      mkdir(snapshotDataDir, { recursive: true }),
      mkdir(snapshotBlogDir, { recursive: true }),
    ]);

    for (const [file, content] of Object.entries(archive.files.data)) {
      await writeFile(join(snapshotDataDir, file), content, "utf-8");
    }
    for (const [file, content] of Object.entries(archive.files.blog)) {
      await writeFile(join(snapshotBlogDir, file), content, "utf-8");
    }

    await registerPreparedSnapshot(temporaryDir, snapshotDir, meta);
    return meta;
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

async function swapRestoredContent(stagedRoot: string, recoveryRoot: string): Promise<void> {
  const stagedDataDir = join(stagedRoot, "data");
  const stagedBlogDir = join(stagedRoot, "blog");
  const backupDataDir = join(recoveryRoot, "previous-data");
  const backupBlogDir = join(recoveryRoot, "previous-blog");
  let dataBackedUp = false;
  let blogBackedUp = false;
  let dataInstalled = false;
  let blogInstalled = false;

  await mkdir(dirname(config.currentDataDir), { recursive: true });

  try {
    if (await pathExists(config.currentDataDir)) {
      await rename(config.currentDataDir, backupDataDir);
      dataBackedUp = true;
    }
    await rename(stagedDataDir, config.currentDataDir);
    dataInstalled = true;

    if (await pathExists(config.currentBlogDir)) {
      await rename(config.currentBlogDir, backupBlogDir);
      blogBackedUp = true;
    }
    await rename(stagedBlogDir, config.currentBlogDir);
    blogInstalled = true;
  } catch (error) {
    const rollbackErrors: string[] = [];

    try {
      if (blogInstalled) {
        await rm(config.currentBlogDir, { recursive: true, force: true });
      }
      if (blogBackedUp) await rename(backupBlogDir, config.currentBlogDir);
    } catch (rollbackError) {
      rollbackErrors.push(`blog: ${String(rollbackError)}`);
    }

    try {
      if (dataInstalled) {
        await rm(config.currentDataDir, { recursive: true, force: true });
      }
      if (dataBackedUp) await rename(backupDataDir, config.currentDataDir);
    } catch (rollbackError) {
      rollbackErrors.push(`data: ${String(rollbackError)}`);
    }

    const rollbackDetail = rollbackErrors.length
      ? ` Rollback incompleto (${rollbackErrors.join("; ")}). Los archivos de recuperación se conservaron en ${recoveryRoot}.`
      : " El contenido anterior fue restaurado correctamente.";
    throw new RestoreSwapError(
      `No se pudo activar el respaldo: ${String(error)}.${rollbackDetail}`,
      rollbackErrors.length > 0
    );
  }
}

/**
 * Restore a snapshot — copy its files back to the current working directory.
 */
export function restoreSnapshot(id: number): Promise<SnapshotMeta> {
  return withContentMutation(() => restoreSnapshotUnlocked(id));
}

async function restoreSnapshotUnlocked(id: number): Promise<SnapshotMeta> {
  const db = getDb();
  const row = db
    .query("SELECT * FROM snapshots WHERE id = ?")
    .get(id) as SnapshotRow | null;

  const diskMeta = (await listSnapshotMetasFromDisk()).find((snapshot) => snapshot.id === id) ?? null;
  const meta = diskMeta ?? (row
    ? {
        id: row.id,
        description: row.description,
        author: row.author,
        dirName: row.dir_name,
        createdAt: row.created_at,
      }
    : null);

  if (!meta) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, meta.dirName);
  const snapshotDataDir = join(snapshotDir, "data");
  const snapshotBlogDir = join(snapshotDir, "blog");
  const recoveryRoot = join(
    config.contentDir,
    `.restore-${id}-${process.pid}-${Date.now()}`
  );
  const stagedRoot = join(recoveryRoot, "staged");
  let keepRecoveryFiles = false;

  await rm(recoveryRoot, { recursive: true, force: true });
  try {
    await Promise.all([
      copyMatchingTextFiles(
        config.currentDataDir,
        join(stagedRoot, "data"),
        isJsonFile,
        true
      ),
      copyMatchingTextFiles(
        config.currentBlogDir,
        join(stagedRoot, "blog"),
        isSnapshotBlogFile,
        true
      ),
    ]);

    // Overlay the selected snapshot. Files missing from legacy snapshots remain
    // available from the current state instead of being deleted.
    await Promise.all([
      copyMatchingTextFiles(
        snapshotDataDir,
        join(stagedRoot, "data"),
        isJsonFile
      ),
      copyMatchingTextFiles(
        snapshotBlogDir,
        join(stagedRoot, "blog"),
        isSnapshotBlogFile
      ),
    ]);
    await validateSnapshotFiles(stagedRoot);
    await swapRestoredContent(stagedRoot, recoveryRoot);

    return {
      id: meta.id,
      description: meta.description,
      author: meta.author,
      dirName: meta.dirName,
      createdAt: meta.createdAt,
    };
  } catch (error) {
    if (error instanceof RestoreSwapError) {
      keepRecoveryFiles = error.keepRecoveryFiles;
      throw new SnapshotError(error.message, 500);
    }
    throw new SnapshotError(
      `No se pudo preparar el respaldo sin modificar el contenido actual: ${String(error)}`,
      500
    );
  } finally {
    if (!keepRecoveryFiles) {
      await rm(recoveryRoot, { recursive: true, force: true });
    }
  }
}

/**
 * Delete a snapshot directory and its DB row.
 */
export async function deleteSnapshot(id: number): Promise<void> {
  const db = getDb();
  const row = db
    .query("SELECT * FROM snapshots WHERE id = ?")
    .get(id) as SnapshotRow | null;

  const diskMeta = row ? null : (await listSnapshotMetasFromDisk()).find((snapshot) => snapshot.id === id) ?? null;
  if (!row && !diskMeta) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, row?.dir_name ?? diskMeta!.dirName);

  try {
    await rm(snapshotDir, { recursive: true, force: true });
  } catch (err) {
    throw new SnapshotError(
      `No se pudo eliminar la carpeta del respaldo (${snapshotDir}). Es posible que esté bloqueada por otro proceso (OneDrive/antivirus). Intenta de nuevo. Detalle: ${(err as Error).message}`,
      500
    );
  }

  if (row) db.query("DELETE FROM snapshots WHERE id = ?").run(id);
}

const DAILY_RETENTION_DAYS = 30;
const MONTHLY_RETENTION_MONTHS = 12;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function yearKey(date: Date): string {
  return String(date.getFullYear());
}

function selectSnapshotsToKeep(snapshots: SnapshotMeta[], now: Date): Set<number> {
  const keep = new Set<number>();
  if (snapshots.length === 0) return keep;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  keep.add(sorted[0].id);

  const dailyCutoff = new Date(now);
  dailyCutoff.setDate(dailyCutoff.getDate() - DAILY_RETENTION_DAYS);

  const monthlyCutoff = new Date(now);
  monthlyCutoff.setMonth(monthlyCutoff.getMonth() - MONTHLY_RETENTION_MONTHS);

  const seenDays = new Set<string>();
  const seenMonths = new Set<string>();
  const seenYears = new Set<string>();

  for (const snapshot of sorted) {
    const created = new Date(snapshot.createdAt);
    if (Number.isNaN(created.getTime())) {
      keep.add(snapshot.id);
      continue;
    }

    if (created >= dailyCutoff) {
      const key = dayKey(created);
      if (!seenDays.has(key)) {
        seenDays.add(key);
        keep.add(snapshot.id);
      }
    } else if (created >= monthlyCutoff) {
      const key = monthKey(created);
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        keep.add(snapshot.id);
      }
    } else {
      const key = yearKey(created);
      if (!seenYears.has(key)) {
        seenYears.add(key);
        keep.add(snapshot.id);
      }
    }
  }

  return keep;
}

export async function applyRetentionPolicy(now: Date = new Date()): Promise<number[]> {
  const snapshots = await listSnapshots();
  const keep = selectSnapshotsToKeep(snapshots, now);
  const removed: number[] = [];

  for (const snapshot of snapshots) {
    if (!keep.has(snapshot.id)) {
      try {
        await deleteSnapshot(snapshot.id);
        removed.push(snapshot.id);
      } catch (err) {
        console.error(`[Retention] Failed to delete snapshot ${snapshot.id}:`, err);
      }
    }
  }

  return removed;
}

function hasSnapshotForDay(snapshots: SnapshotMeta[], date: Date): boolean {
  const key = dayKey(date);
  return snapshots.some((snapshot) => {
    const created = new Date(snapshot.createdAt);
    return !Number.isNaN(created.getTime()) && dayKey(created) === key;
  });
}

export async function runDailyBackup(now: Date = new Date()): Promise<SnapshotMeta | null> {
  const snapshots = await listSnapshots();
  let created: SnapshotMeta | null = null;

  if (!hasSnapshotForDay(snapshots, now)) {
    created = await createSnapshot(
      `Respaldo automático ${dayKey(now)}`,
      "Sistema"
    );
    console.log(`[Backup] Created daily snapshot #${created.id} (${created.dirName})`);
  }

  const removed = await applyRetentionPolicy(now);
  if (removed.length > 0) {
    console.log(`[Retention] Removed ${removed.length} old snapshot(s): ${removed.join(", ")}`);
  }

  return created;
}

const DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let dailyBackupTimer: ReturnType<typeof setInterval> | null = null;

export function startDailyBackupScheduler(): void {
  if (dailyBackupTimer) return;

  runDailyBackup().catch((err) => {
    console.error("[Backup] Initial daily backup failed:", err);
  });

  dailyBackupTimer = setInterval(() => {
    runDailyBackup().catch((err) => {
      console.error("[Backup] Scheduled daily backup failed:", err);
    });
  }, DAILY_BACKUP_INTERVAL_MS);
}

export function stopDailyBackupScheduler(): void {
  if (dailyBackupTimer) {
    clearInterval(dailyBackupTimer);
    dailyBackupTimer = null;
  }
}

export class SnapshotError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SnapshotError";
    this.status = status;
  }
}

function validateArchiveFiles(files: Record<string, string>, extension: string): void {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new SnapshotError("Invalid snapshot archive files", 400);
  }

  for (const [file, content] of Object.entries(files)) {
    if (!file.endsWith(extension) || file.includes("..") || file.includes("/") || file.includes("\\")) {
      throw new SnapshotError(`Invalid archive filename: ${file}`, 400);
    }
    if (typeof content !== "string") {
      throw new SnapshotError(`Invalid archive content: ${file}`, 400);
    }
  }
}
