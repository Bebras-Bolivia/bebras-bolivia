import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const secret = process.env.WEBHOOK_SECRET ?? "";
const branch = process.env.BRANCH ?? "master";
const repoDir = resolve(import.meta.dir, "..");
const cmsDir = resolve(repoDir, "cms");
const cmsCurrentDataDir = resolve(cmsDir, "content", "current", "data");
const cmsCurrentBlogDir = resolve(cmsDir, "content", "current", "blog");
const cmsMediaDir = resolve(cmsDir, "content", "media");
const cmsSnapshotsDir = resolve(cmsDir, "content", "snapshots");
const landingDataDir = resolve(repoDir, "src", "data");
const landingBlogDir = resolve(repoDir, "src", "content", "blog");
const landingUploadsDir = resolve(repoDir, "public", "images", "uploads");
const BLOG_PREVIEW_FILENAME = "cms-preview.md";

let deployRunning = false;
let deployQueued = false;

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, NODE_OPTIONS: "" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(output);
        return;
      }

      rejectPromise(
        new Error(
          [`Command failed with exit code ${code}: ${cmd} ${args.join(" ")}`, output.trim()]
            .filter(Boolean)
            .join("\n")
        )
      );
    });
  });
}

function getAstroBuildCommand(): { cmd: string; args: string[] } {
  const localAstro = resolve(
    repoDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "astro.cmd" : "astro"
  );

  if (existsSync(localAstro)) {
    return process.platform === "win32"
      ? { cmd: localAstro, args: ["build"] }
      : { cmd: process.execPath, args: [localAstro, "build"] };
  }

  return {
    cmd: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "build"],
  };
}

function getCmsUiBuildCommand(): { cmd: string; args: string[]; cwd: string } {
  const uiDir = resolve(cmsDir, "ui");
  const localAstro = resolve(
    uiDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "astro.cmd" : "astro"
  );

  if (existsSync(localAstro)) {
    return process.platform === "win32"
      ? { cmd: localAstro, args: ["build"], cwd: uiDir }
      : { cmd: process.execPath, args: [localAstro, "build"], cwd: uiDir };
  }

  return {
    cmd: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "build"],
    cwd: uiDir,
  };
}

async function listTrackedFiles(patterns: string[]): Promise<string[]> {
  if (patterns.length === 0) return [];

  const output = await runCommand("git", ["ls-files", "--", ...patterns], repoDir);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function restoreCmsMirrorFiles(): Promise<void> {
  const mirrorFiles = await listTrackedFiles([
    "cms/content/current/data/*.json",
    "src/data/*.json",
    "src/content/blog/*.md",
    "public/images/uploads/*",
  ]);

  if (mirrorFiles.length === 0) return;

  log(`Restoring ${mirrorFiles.length} generated mirror file(s) before pull.`);
  await runCommand("git", ["update-index", "--no-skip-worktree", "--", ...mirrorFiles], repoDir);
  await runCommand("git", ["restore", "--worktree", "--source=HEAD", "--", ...mirrorFiles], repoDir);
}

async function getLatestSnapshotDataDir(): Promise<string | null> {
  try {
    const entries = await readdir(cmsSnapshotsDir, { withFileTypes: true });
    const snapshots = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("snapshot-"))
      .map((entry) => entry.name)
      .sort();

    const latest = snapshots.at(-1);
    return latest ? resolve(cmsSnapshotsDir, latest, "data") : null;
  } catch {
    return null;
  }
}

async function ensureCmsCurrentData(): Promise<void> {
  await mkdir(cmsCurrentDataDir, { recursive: true });

  const currentFiles = (await readdir(cmsCurrentDataDir)).filter((file) => file.endsWith(".json"));
  if (currentFiles.length > 0) return;

  const latestSnapshotDataDir = await getLatestSnapshotDataDir();
  if (!latestSnapshotDataDir) {
    log("No CMS current data or snapshots found to restore.");
    return;
  }

  log(`Restoring CMS current data from ${latestSnapshotDataDir}.`);
  const snapshotFiles = (await readdir(latestSnapshotDataDir)).filter((file) => file.endsWith(".json"));
  for (const file of snapshotFiles) {
    await cp(resolve(latestSnapshotDataDir, file), resolve(cmsCurrentDataDir, file));
  }
}

async function syncCmsCurrentToLanding(): Promise<void> {
  await ensureCmsCurrentData();
  await mkdir(landingDataDir, { recursive: true });
  await mkdir(landingBlogDir, { recursive: true });
  await mkdir(landingUploadsDir, { recursive: true });

  try {
    const dataFiles = (await readdir(cmsCurrentDataDir)).filter((file) => file.endsWith(".json"));
    for (const file of dataFiles) {
      await cp(resolve(cmsCurrentDataDir, file), resolve(landingDataDir, file));
    }
  } catch {
    log("No CMS data files available to sync.");
  }

  try {
    const blogFiles = (await readdir(cmsCurrentBlogDir)).filter(
      (file) => file.endsWith(".md") && file !== BLOG_PREVIEW_FILENAME
    );
    for (const file of blogFiles) {
      await cp(resolve(cmsCurrentBlogDir, file), resolve(landingBlogDir, file));
    }
  } catch {
    log("No CMS blog files available to sync.");
  }

  try {
    const mediaFiles = await readdir(cmsMediaDir);
    for (const file of mediaFiles) {
      await cp(resolve(cmsMediaDir, file), resolve(landingUploadsDir, file));
    }
  } catch {
    log("No CMS media files available to sync.");
  }
}

function shouldRebuildCmsUi(changedFiles: string[]): boolean {
  return changedFiles.some((file) => file.startsWith("cms/ui/"));
}

function shouldRestartCms(changedFiles: string[]): boolean {
  return changedFiles.some((file) =>
    file.startsWith("cms/src/") ||
    file === "cms/package.json" ||
    file === "cms/package-lock.json"
  );
}

async function restartCmsProcess(): Promise<void> {
  const output = await runCommand(
    process.platform === "win32" ? "tasklist" : "pgrep",
    process.platform === "win32" ? [] : ["-f", "bun src/index.ts"],
    repoDir
  );

  const pid = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0])
    .find((value) => /^\d+$/.test(value));

  if (!pid) {
    log("CMS process not found; skipping restart.");
    return;
  }

  log(`Restarting CMS process ${pid}...`);
  await runCommand("kill", [pid], repoDir);
}

async function ensureExpectedBranch(): Promise<void> {
  const currentBranch = (
    await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], repoDir)
  ).trim();

  if (currentBranch !== branch) {
    throw new Error(
      `Webhook configured for branch "${branch}" but repository is on "${currentBranch}".`
    );
  }
}

async function ensureCleanTrackedFiles(): Promise<void> {
  const status = await runCommand(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    repoDir
  );
  const dirty = status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (dirty.length > 0) {
    throw new Error(
      `Local tracked changes are blocking automatic deploy:\n${dirty.join("\n")}`
    );
  }
}

async function deployLatest(): Promise<void> {
  await ensureExpectedBranch();
  // Restore CMS-managed content files (cms/content/current/data/*.json,
  // src/data/*.json, blog, uploads) to HEAD first: the CMS rewrites them on
  // every save/publish, so they are expected to be dirty. Cleaning them before
  // the guard prevents a normal publish from blocking the auto-deploy, while
  // still catching genuinely unexpected changes. On an external-push deploy this
  // also makes the incoming committed content authoritative (coordination).
  await restoreCmsMirrorFiles();
  await ensureCleanTrackedFiles();
  await runCommand("git", ["fetch", "origin", branch], repoDir);

  const localHead = (await runCommand("git", ["rev-parse", "HEAD"], repoDir)).trim();
  const remoteHead = (
    await runCommand("git", ["rev-parse", `origin/${branch}`], repoDir)
  ).trim();

  if (localHead === remoteHead) {
    log(`No new commits on origin/${branch}; skipping build.`);
    return;
  }

  const changedFilesOutput = await runCommand(
    "git",
    ["diff", "--name-only", "HEAD", `origin/${branch}`],
    repoDir
  );
  const changedFiles = changedFilesOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await runCommand("git", ["pull", "--ff-only", "origin", branch], repoDir);
  await syncCmsCurrentToLanding();
  await rm(resolve(landingBlogDir, BLOG_PREVIEW_FILENAME), { force: true });

  const build = getAstroBuildCommand();
  await runCommand(build.cmd, build.args, repoDir);

  if (shouldRebuildCmsUi(changedFiles)) {
    const cmsUiBuild = getCmsUiBuildCommand();
    await runCommand(cmsUiBuild.cmd, cmsUiBuild.args, cmsUiBuild.cwd);
  }

  if (shouldRestartCms(changedFiles)) {
    await restartCmsProcess();
  }
}

async function scheduleDeploy(): Promise<void> {
  if (deployRunning) {
    deployQueued = true;
    log("Deploy already running; queued one follow-up run.");
    return;
  }

  deployRunning = true;
  do {
    deployQueued = false;
    log("Push detected — pulling and building...");

    try {
      await deployLatest();
      log("Build complete ✓");
    } catch (error) {
      const message =
        error instanceof Error ? error.stack ?? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Build failed: ${message}`);
    }
  } while (deployQueued);

  deployRunning = false;
}

function hasValidSignature(payload: string, signatureHeader: string | null): boolean {
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;

  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  const expected = Buffer.from(`sha256=${digest}`);
  const received = Buffer.from(signatureHeader);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = await request.text();
    if (!hasValidSignature(payload, request.headers.get("x-hub-signature-256"))) {
      log("Rejected webhook with invalid signature.");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = request.headers.get("x-github-event");
    if (event === "ping") {
      log("Received GitHub ping event.");
      return Response.json({ ok: true, event: "ping" });
    }

    if (event !== "push") {
      return Response.json({ ok: true, ignored: event ?? "unknown" }, { status: 202 });
    }

    let body: { ref?: string } = {};
    try {
      body = payload ? JSON.parse(payload) : {};
    } catch {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    if (body.ref !== `refs/heads/${branch}`) {
      log(`Ignored push for ref "${body.ref ?? "unknown"}".`);
      return Response.json({ ok: true, ignored: body.ref ?? "unknown" }, { status: 202 });
    }

    void scheduleDeploy();
    return Response.json({ ok: true, queued: true }, { status: 202 });
  },
});

log(`Webhook listening on http://127.0.0.1:${server.port}/webhook for branch ${branch}`);
