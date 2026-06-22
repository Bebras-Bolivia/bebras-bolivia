import { readdir, mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { gzipSync, gunzipSync } from "zlib";
import { config } from "../config.js";
import { getDb, type SnapshotRow } from "../db/index.js";
import { CONTENT_FILES } from "../content/schemas.js";
import { copyUtf8TextFile } from "../lib/utf8-files.js";

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
export async function createSnapshot(
  description: string,
  author: string
): Promise<SnapshotMeta> {
  const db = getDb();
  const id = await nextSnapshotId();
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;

  db.query(
    "INSERT INTO snapshots (id, description, author, dir_name) VALUES (?, ?, ?, ?)"
  ).run(id, description, author, dirName);

  const snapshotDir = join(config.snapshotsDir, dirName);
  const snapshotDataDir = join(snapshotDir, "data");
  const snapshotBlogDir = join(snapshotDir, "blog");

  await mkdir(snapshotDataDir, { recursive: true });
  await mkdir(snapshotBlogDir, { recursive: true });

  // Copy current data files
  try {
    for (const file of CONTENT_FILES) {
      try {
        await copyUtf8TextFile(
          join(config.currentDataDir, file),
          join(snapshotDataDir, file)
        );
      } catch {
        // Missing optional working-copy file; skip it.
      }
    }
  } catch {
    // No data files yet — that's fine
  }

  // Copy current blog files
  try {
    const blogFiles = await readdir(config.currentBlogDir);
    for (const file of blogFiles) {
      if (isSnapshotBlogFile(file)) {
        await copyUtf8TextFile(
          join(config.currentBlogDir, file),
          join(snapshotBlogDir, file)
        );
      }
    }
  } catch {
    // No blog files yet — that's fine
  }

  // Write meta.json into the snapshot
  const meta: SnapshotMeta = {
    id,
    description,
    author,
    dirName,
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    join(snapshotDir, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf-8"
  );

  return meta;
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
  const diskByDirName = new Map(diskSnapshots.map((snapshot) => [snapshot.dirName, snapshot]));
  const snapshots = rows.map((r) => diskByDirName.get(r.dir_name) ?? ({
    id: r.id,
    description: r.description,
    author: r.author,
    dirName: r.dir_name,
    createdAt: r.created_at,
  }));

  const seen = new Set(snapshots.map((snapshot) => snapshot.dirName));
  for (const snapshot of diskSnapshots) {
    if (!seen.has(snapshot.dirName)) snapshots.push(snapshot);
  }

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

export async function importSnapshotArchive(buffer: Buffer, author: string): Promise<SnapshotMeta> {
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

  const db = getDb();
  const description = archive.meta?.description
    ? `Importado: ${archive.meta.description}`
    : "Importado desde archivo";
  const id = await nextSnapshotId();
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;
  db.query("INSERT INTO snapshots (id, description, author, dir_name) VALUES (?, ?, ?, ?)").run(id, description, author, dirName);

  const snapshotDir = join(config.snapshotsDir, dirName);
  const snapshotDataDir = join(snapshotDir, "data");
  const snapshotBlogDir = join(snapshotDir, "blog");
  await mkdir(snapshotDataDir, { recursive: true });
  await mkdir(snapshotBlogDir, { recursive: true });

  for (const [file, content] of Object.entries(archive.files.data)) {
    await writeFile(join(snapshotDataDir, file), content, "utf-8");
  }

  for (const [file, content] of Object.entries(archive.files.blog)) {
    await writeFile(join(snapshotBlogDir, file), content, "utf-8");
  }

  const meta: SnapshotMeta = {
    id,
    description,
    author,
    dirName,
    createdAt: new Date().toISOString(),
  };
  await writeFile(join(snapshotDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

  return meta;
}

/**
 * Restore a snapshot — copy its files back to the current working directory.
 */
export async function restoreSnapshot(id: number): Promise<SnapshotMeta> {
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

  // Clear current data dir and copy snapshot data
  await mkdir(config.currentDataDir, { recursive: true });
  try {
    const currentDataFiles = await readdir(config.currentDataDir);
    for (const file of currentDataFiles) {
      if (file.endsWith(".json")) {
        await rm(join(config.currentDataDir, file));
      }
    }
  } catch {}

  try {
    for (const file of CONTENT_FILES) {
      try {
        await copyUtf8TextFile(
          join(snapshotDataDir, file),
          join(config.currentDataDir, file)
        );
      } catch {
        // Older snapshots may not contain every current content file.
      }
    }
  } catch {}

  // Clear current blog dir and copy snapshot blog
  await mkdir(config.currentBlogDir, { recursive: true });
  try {
    const currentBlogFiles = await readdir(config.currentBlogDir);
    for (const file of currentBlogFiles) {
      if (file.endsWith(".md")) {
        await rm(join(config.currentBlogDir, file));
      }
    }
  } catch {}

  try {
    const blogFiles = await readdir(snapshotBlogDir);
    for (const file of blogFiles) {
      if (isSnapshotBlogFile(file)) {
        await copyUtf8TextFile(
          join(snapshotBlogDir, file),
          join(config.currentBlogDir, file)
        );
      }
    }
  } catch {}

  return {
    id: meta.id,
    description: meta.description,
    author: meta.author,
    dirName: meta.dirName,
    createdAt: meta.createdAt,
  };
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
    await rm(snapshotDir, { recursive: true });
  } catch {
    // Directory might not exist — that's fine, still delete DB row
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
