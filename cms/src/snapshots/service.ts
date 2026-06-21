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
  const result = db
    .query("INSERT INTO snapshots (description, author, dir_name) VALUES (?, ?, ?)")
    .run(description, author, "placeholder");
  const id = Number(result.lastInsertRowid);
  const dirName = `snapshot-${String(id).padStart(4, "0")}`;
  db.query("UPDATE snapshots SET dir_name = ? WHERE id = ?").run(dirName, id);

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
