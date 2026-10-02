import { cp, mkdir, mkdtemp, rm, symlink, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';

export const repo = resolve(import.meta.dirname, '../..');
export const credentials = { email: 'pruebas@example.test', password: 'SoloPruebas-2026!' };
export const jwtSecret = 'cms-pruebas-aisladas-secret-2026';
const bun = process.versions.bun ? process.execPath : process.env.BUN_EXE || 'bun';

export function assertOutsideRepo(path: string) {
  const rel = relative(repo, resolve(path));
  if (!rel || (!rel.startsWith(`..${sep}`) && !isAbsolute(rel)))
    throw new Error('Pruebas: prohibido usar el repositorio real');
}

export async function command(cmd: string, args: string[], cwd: string, env = process.env) {
  return new Promise<string>((done, fail) => {
    const child = spawn(cmd, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', fail);
    child.on('exit', (code) =>
      code === 0 ? done(output) : fail(new Error(`${cmd} ${args.join(' ')} (${code})\n${output}`))
    );
  });
}

export async function createSandbox({ buildSite = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'bebras-cms-test-'));
  assertOutsideRepo(root);
  const landing = join(root, 'site');
  const content = join(landing, 'cms/content');
  await mkdir(landing);
  const children: ReturnType<typeof spawn>[] = [];
  let staticServer: ReturnType<typeof createServer> | undefined;
  let log = '';
  async function close() {
    for (const child of children) {
      if (child.exitCode === null) {
        if (process.platform === 'win32')
          execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
            windowsHide: true,
            stdio: 'ignore',
          });
        else child.kill('SIGTERM');
      }
    }
    await Promise.all(
      children.map((child) =>
        child.exitCode !== null
          ? Promise.resolve()
          : new Promise<void>((done) => child.once('exit', () => done()))
      )
    );
    if (staticServer) await new Promise<void>((done) => staticServer!.close(() => done()));
    assertOutsideRepo(root);
    await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
  try {
    for (const file of ['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json']) {
      await cp(join(repo, file), join(landing, file), {
        recursive: true,
        filter: (source) =>
          !source.includes(`${sep}certificados${sep}`) && !source.endsWith(`${sep}certificados`),
      });
    }
    // Dependencies are read-only junctions; source/content/build output are independent copies.
    await symlink(
      join(repo, 'node_modules'),
      join(landing, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    await cp(join(repo, 'cms/content/current'), join(content, 'current'), { recursive: true });
    await mkdir(join(content, 'media'), { recursive: true });
    await command('git', ['init', '-b', 'main'], landing);
    await command('git', ['config', 'user.email', 'pruebas@example.test'], landing);
    await command('git', ['config', 'user.name', 'Pruebas CMS'], landing);
    // No fetch remote exists; every possible origin push is a local invalid destination.
    await command(
      'git',
      ['config', 'remote.origin.pushurl', join(root, 'PUSH-BLOQUEADO', 'no-existe.git')],
      landing
    );
    await command('git', ['add', 'src', 'cms/content/current/data'], landing);
    await command('git', ['commit', '-m', 'Fixture aislada'], landing);
    const env = {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: '0',
      CMS_BASE_PATH: '/admbb',
      CONTENT_DIR: content,
      LANDING_DIR: landing,
      LANDING_DATA_DIR: join(landing, 'src/data'),
      LANDING_BLOG_DIR: join(landing, 'src/content/blog'),
      LANDING_PUBLIC_DIR: join(landing, 'public'),
      ADMIN_EMAIL: credentials.email,
      ADMIN_PASSWORD: credentials.password,
      ADMIN_NAME: 'Pruebas',
      JWT_SECRET: jwtSecret,
      COOKIE_NAME: 'cms_test_token',
      SITE_URL: '',
      JWT_EXPIRY: '24h',
    };
    // Reserve a free port and release it immediately before spawning.
    const probe = createServer();
    await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
    const port = (probe.address() as { port: number }).port;
    await new Promise<void>((done) => probe.close(() => done()));
    env.PORT = String(port);
    const url = `http://127.0.0.1:${port}/admbb`;
    const child = spawn(bun, [join(repo, 'cms/src/index.ts')], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    child.stdout!.on('data', (chunk) => {
      log += chunk;
    });
    child.stderr!.on('data', (chunk) => {
      log += chunk;
    });
    let ready = false;
    for (let n = 0; n < 900; n++) {
      if (child.exitCode !== null) throw new Error(`CMS no inició: ${log}`);
      try {
        if ((await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) })).ok) {
          ready = true;
          break;
        }
      } catch {
        /* waiting for boot */
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    if (!ready) throw new Error(`CMS no respondió: ${log}`);
    const login = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!login.ok) throw new Error(`Login fixture: ${await login.text()}`);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    async function request(path: string, method = 'GET', body?: unknown, authenticated = true) {
      const headers: Record<string, string> = authenticated ? { cookie } : {};
      if (body !== undefined && !(body instanceof FormData))
        headers['content-type'] = 'application/json';
      return fetch(`${url}${path}`, {
        method,
        headers,
        body:
          body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
    }
    async function build() {
      assertOutsideRepo(landing);
      // Use the CMS publish lock: direct Astro builds can race the automatic publish.
      for (let attempt = 0; attempt < 180; attempt++) {
        const response = await request('/api/publish', 'POST');
        if (response.status === 409) {
          await new Promise((done) => setTimeout(done, 1000));
          continue;
        }
        const result = await response.json();
        if (!response.ok || result.publish?.status !== 'success')
          throw new Error(`Build aislado: ${JSON.stringify(result)}\n${log}`);
        return;
      }
      throw new Error(`Publicación bloqueada durante 180s: ${log}`);
    }
    staticServer = createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
        const base = join(landing, 'dist');
        let target = resolve(base, `.${pathname}`);
        if (relative(base, target).startsWith('..')) {
          res.writeHead(403).end();
          return;
        }
        if (!existsSync(target) || !/\.[a-z0-9]+$/i.test(target))
          target = join(target, 'index.html');
        const bytes = await readFile(target);
        const ext = target.split('.').pop();
        const types: Record<string, string> = {
          html: 'text/html; charset=utf-8',
          js: 'text/javascript',
          css: 'text/css',
          json: 'application/json',
          svg: 'image/svg+xml',
          png: 'image/png',
          webp: 'image/webp',
          woff2: 'font/woff2',
        };
        res
          .writeHead(200, { 'content-type': types[ext!] || 'application/octet-stream' })
          .end(bytes);
      } catch {
        res.writeHead(404).end('Not found');
      }
    });
    await new Promise<void>((done) => staticServer!.listen(0, '127.0.0.1', done));
    const siteUrl = `http://127.0.0.1:${(staticServer.address() as { port: number }).port}`;
    if (buildSite) await build();
    return { root, landing, content, url, siteUrl, cookie, request, build, close, logs: () => log };
  } catch (error) {
    await close();
    throw error;
  }
}
