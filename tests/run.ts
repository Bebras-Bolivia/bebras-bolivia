import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { command, repo } from './helpers/sandbox';

const group = process.argv[2] ?? 'all';
const output = resolve(repo, '../_pruebas/cms-sitio');
await mkdir(output, { recursive: true });
const bun = process.execPath;
const groups: Record<string, string[]> = {
  unidad: [
    'test',
    'tests/unit',
    '--coverage',
    '--coverage-reporter=lcov',
    `--coverage-dir=${output}/coverage`,
    '--reporter=junit',
    `--reporter-outfile=${output}/unidad.xml`,
  ],
  api: [
    'test',
    'tests/api',
    '--timeout',
    '60000',
    '--reporter=junit',
    `--reporter-outfile=${output}/api.xml`,
  ],
  cms: ['x', 'playwright', 'test', '--project', 'cms'],
  sitio: ['x', 'playwright', 'test', '--project', 'sitio'],
  integracion: ['x', 'playwright', 'test', '--project', 'integracion'],
  e2e: ['x', 'playwright', 'test'],
  calidad: ['--experimental-strip-types', 'tests/quality.ts'],
};
const selected = group === 'all' ? ['unidad', 'api', 'e2e', 'calidad'] : [group];
let failed = false;
for (const name of selected) {
  if (!groups[name]) throw new Error(`Grupo desconocido: ${name}`);
  if (['cms', 'e2e'].includes(name)) {
    await command(bun, ['run', '--cwd', 'cms', 'ui:build'], repo, {
      ...process.env,
      CMS_BASE_PATH: '/admbb',
    });
  }
  try {
    const log = await command(name === 'calidad' ? 'node' : bun, groups[name], repo);
    console.log(log);
    await writeFile(resolve(output, `${name}.log`), log);
  } catch (error) {
    failed = true;
    const log = String(error);
    console.error(log);
    await writeFile(resolve(output, `${name}.log`), log);
  }
}
if (group === 'all') {
  try {
    console.log(await command(bun, ['tests/report.ts'], repo));
  } catch (error) {
    failed = true;
    console.error(`No se pudo consolidar el informe: ${String(error)}`);
  }
}
process.exitCode = failed ? 1 : 0;
