import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../config.js';

const root = join(config.contentDir, 'published');
const pointer = join(root, 'current.json');

export async function publishedDirectories() {
  try {
    const { release } = JSON.parse(await readFile(pointer, 'utf8')) as { release: string };
    if (!/^[a-z0-9-]+$/.test(release)) throw new Error('Invalid published-state release');
    return {
      data: join(root, 'releases', release, 'data'),
      blog: join(root, 'releases', release, 'blog'),
    };
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    return { data: config.landingDataDir, blog: config.landingBlogDir };
  }
}

// Seed only once, before preview or save routes can overwrite landing sources.
export async function initializePublishedState() {
  try {
    await readFile(pointer);
    return;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const release = `initial-${Date.now()}`;
  await capturePublishedState(release);
  await activatePublishedState(release);
}

export async function capturePublishedState(release: string) {
  const destination = join(root, 'releases', release);
  await mkdir(destination, { recursive: true });
  await Promise.all([
    cp(config.landingDataDir, join(destination, 'data'), { recursive: true }),
    cp(config.landingBlogDir, join(destination, 'blog'), {
      recursive: true,
      filter: (source) => !source.endsWith('cms-preview.md'),
    }),
  ]);
}

export async function activatePublishedState(release: string) {
  const temporary = join(root, `current-${process.pid}.tmp`);
  await writeFile(temporary, JSON.stringify({ release }));
  await rename(temporary, pointer);
  // Keep one previous generation for diagnosis; never delete the active state.
  const releases = (await readdir(join(root, 'releases')))
    .filter((name) => name !== release)
    .sort()
    .reverse();
  await Promise.all(
    releases
      .slice(1)
      .map((name) => rm(join(root, 'releases', name), { recursive: true, force: true }))
  ).catch((error) => console.error('[Publish] Baseline cleanup failed:', error));
}

export async function discardPublishedState(release: string) {
  await rm(join(root, 'releases', release), { recursive: true, force: true });
}
