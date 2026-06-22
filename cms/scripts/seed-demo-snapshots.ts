import { Database } from "bun:sqlite";
import { mkdir, cp, writeFile, readdir } from "fs/promises";
import { join, resolve } from "path";

const CMS_ROOT = resolve(import.meta.dir, "..");
const dbPath = join(CMS_ROOT, "content", "cms.sqlite");
const snapshotsDir = join(CMS_ROOT, "content", "snapshots");
const currentDataDir = join(CMS_ROOT, "content", "current", "data");
const currentBlogDir = join(CMS_ROOT, "content", "current", "blog");

const DEMO_TAG = "[DEMO]";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function yearsAgo(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

const plan: { when: Date; desc: string }[] = [
  { when: daysAgo(0), desc: `${DEMO_TAG} Respaldo de hoy` },
  { when: daysAgo(1), desc: `${DEMO_TAG} Respaldo diario` },
  { when: daysAgo(3), desc: `${DEMO_TAG} Respaldo diario` },
  { when: daysAgo(8), desc: `${DEMO_TAG} Respaldo diario` },
  { when: daysAgo(20), desc: `${DEMO_TAG} Respaldo diario` },
  { when: monthsAgo(2), desc: `${DEMO_TAG} Respaldo mensual` },
  { when: monthsAgo(4), desc: `${DEMO_TAG} Respaldo mensual` },
  { when: monthsAgo(7), desc: `${DEMO_TAG} Respaldo mensual` },
  { when: monthsAgo(11), desc: `${DEMO_TAG} Respaldo mensual` },
  { when: yearsAgo(1), desc: `${DEMO_TAG} Respaldo anual` },
  { when: yearsAgo(2), desc: `${DEMO_TAG} Respaldo anual` },
  { when: yearsAgo(3), desc: `${DEMO_TAG} Respaldo anual` },
];

function toSqliteDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

async function copyContent(snapshotDir: string) {
  const dataDir = join(snapshotDir, "data");
  const blogDir = join(snapshotDir, "blog");
  await mkdir(dataDir, { recursive: true });
  await mkdir(blogDir, { recursive: true });

  try {
    for (const file of await readdir(currentDataDir)) {
      if (file.endsWith(".json")) {
        await cp(join(currentDataDir, file), join(dataDir, file));
      }
    }
  } catch {}

  try {
    for (const file of await readdir(currentBlogDir)) {
      if (file.endsWith(".md")) {
        await cp(join(currentBlogDir, file), join(blogDir, file));
      }
    }
  } catch {}
}

async function main() {
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL");

  for (const entry of plan) {
    const result = db
      .query("INSERT INTO snapshots (description, author, dir_name, created_at) VALUES (?, ?, ?, ?)")
      .run(entry.desc, "Sistema", "placeholder", toSqliteDate(entry.when));

    const id = Number(result.lastInsertRowid);
    const dirName = `snapshot-${String(id).padStart(4, "0")}`;
    db.query("UPDATE snapshots SET dir_name = ? WHERE id = ?").run(dirName, id);

    const snapshotDir = join(snapshotsDir, dirName);
    await copyContent(snapshotDir);

    await writeFile(
      join(snapshotDir, "meta.json"),
      JSON.stringify(
        { id, description: entry.desc, author: "Sistema", dirName, createdAt: entry.when.toISOString() },
        null,
        2
      ) + "\n",
      "utf-8"
    );

    console.log(`Created ${dirName} @ ${toSqliteDate(entry.when)} — ${entry.desc}`);
  }

  console.log(`\nDone. Inserted ${plan.length} demo snapshots.`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
