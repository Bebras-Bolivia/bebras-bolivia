import { spawn } from "child_process";
import { existsSync } from "fs";
import { cp, mkdir, readdir, rm } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join, relative, resolve } from "path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const cmsRoot = resolve(repoRoot, "cms");
const childEnv = {
  ...process.env,
  CMS_BASE_PATH: process.env.CMS_BASE_PATH || "/admbb",
};

const paths = {
  currentDataDir: resolve(cmsRoot, "content", "current", "data"),
  currentBlogDir: resolve(cmsRoot, "content", "current", "blog"),
  mediaDir: resolve(cmsRoot, "content", "media"),
  landingDataDir: resolve(repoRoot, "src", "data"),
  landingBlogDir: resolve(repoRoot, "src", "content", "blog"),
  landingUploadsDir: resolve(repoRoot, "public", "images", "uploads"),
};

const bunBin = process.platform === "win32" ? "bun.exe" : "bun";
const obsoleteDataFiles = new Set(["custom-pages.json", "site.json", "navigation.json"]);

function needsShell(command) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

async function listFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath);
      return [fullPath];
    })
  );

  return files.flat();
}

async function syncDirectory(sourceDir, targetDir, predicate) {
  await mkdir(targetDir, { recursive: true });

  const [sourceFiles, targetFiles] = await Promise.all([
    listFiles(sourceDir),
    listFiles(targetDir),
  ]);

  const sourceRelativePaths = new Set(
    sourceFiles
      .filter((file) => predicate(file))
      .map((file) => relative(sourceDir, file))
  );

  await Promise.all(
    [...sourceRelativePaths].map(async (file) => {
      const targetPath = join(targetDir, file);
      await mkdir(dirname(targetPath), { recursive: true });
      await cp(join(sourceDir, file), targetPath, { force: true });
    })
  );

  const staleTargetFiles = targetFiles
    .filter((file) => predicate(file))
    .map((file) => relative(targetDir, file))
    .filter((file) => !sourceRelativePaths.has(file));

  await Promise.all(
    staleTargetFiles.map((file) => rm(join(targetDir, file), { force: true }))
  );
}

async function syncCmsToLanding() {
  await Promise.all([
    syncDirectory(paths.currentDataDir, paths.landingDataDir, (file) => {
      const name = file.split(/[\\/]/).pop() || "";
      return file.endsWith(".json") && !obsoleteDataFiles.has(name);
    }),
    syncDirectory(paths.currentBlogDir, paths.landingBlogDir, (file) => file.endsWith(".md")),
    syncDirectory(paths.mediaDir, paths.landingUploadsDir, () => true),
  ]);

  console.log("[build:all] CMS content synced to Astro source.");
}

function prefixStream(stream, prefix, writer) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const text = chunk.replace(/\r?\n$/, "");
    if (!text) return;

    for (const line of text.split(/\r?\n/)) {
      writer(`${prefix} ${line}\n`);
    }
  });
}

function runCommand(label, command, args, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: needsShell(command),
      env: childEnv,
    });

    prefixStream(child.stdout, `[${label}]`, (line) => process.stdout.write(line));
    prefixStream(child.stderr, `[${label}]`, (line) => process.stderr.write(line));

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${label} exited with code ${code ?? 1}`));
    });

    child.on("error", rejectPromise);
  });
}

await syncCmsToLanding();
await runCommand("cms-ui-build", bunBin, ["run", "ui:build"], cmsRoot);
await runCommand("site-build", bunBin, ["run", "build"], repoRoot);

console.log("[build:all] Complete.");
