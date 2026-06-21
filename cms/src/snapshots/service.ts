import { readdir, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
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

/**
 * Create a snapshot of the current content state.
 * Copies all data/ and blog/ files into a numbered snapshot directory.
 */
export async function createSnapshot(
  description: string,
  author: string
): Promise<SnapshotMeta> {
  const db = getDb();

  // Insert row to get the auto-increment ID
  const result = db
    .query(
      "INSERT INTO snapshots (description, author, dir_name) VALUES (?, ?, ?)"
    )
    .run(description, author, "placeholder");

  const id = Number(result.lastInsertRowid);
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;

  // Update the dir_name now that we know the ID
  db.query("UPDATE snapshots SET dir_name = ? WHERE id = ?").run(dirName, id);

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
      if (file.endsWith(".md")) {
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
export function listSnapshots(): SnapshotMeta[] {
  const db = getDb();
  const rows = db
    .query("SELECT * FROM snapshots ORDER BY id DESC")
    .all() as SnapshotRow[];

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    author: r.author,
    dirName: r.dir_name,
    createdAt: r.created_at,
  }));
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

  if (!row) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, row.dir_name);
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
    id: row.id,
    description: row.description,
    author: row.author,
    dirName: row.dir_name,
    createdAt: row.created_at,
    files: { data: dataFiles, blog: blogFiles },
  };
}

/**
 * Restore a snapshot — copy its files back to the current working directory.
 */
export async function restoreSnapshot(id: number): Promise<SnapshotMeta> {
  const db = getDb();
  const row = db
    .query("SELECT * FROM snapshots WHERE id = ?")
    .get(id) as SnapshotRow | null;

  if (!row) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, row.dir_name);
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
      if (file.endsWith(".md")) {
        await copyUtf8TextFile(
          join(snapshotBlogDir, file),
          join(config.currentBlogDir, file)
        );
      }
    }
  } catch {}

  return {
    id: row.id,
    description: row.description,
    author: row.author,
    dirName: row.dir_name,
    createdAt: row.created_at,
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

  if (!row) {
    throw new SnapshotError(`Snapshot not found: ${id}`, 404);
  }

  const snapshotDir = join(config.snapshotsDir, row.dir_name);

  try {
    await rm(snapshotDir, { recursive: true });
  } catch {
    // Directory might not exist — that's fine, still delete DB row
  }

  db.query("DELETE FROM snapshots WHERE id = ?").run(id);
}

export class SnapshotError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SnapshotError";
    this.status = status;
  }
}
