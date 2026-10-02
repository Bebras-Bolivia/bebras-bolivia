import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { repo } from './helpers/sandbox';

const directory = resolve(repo, '../_pruebas/cms-sitio');
const cases: Array<{ group: string; name: string; status: string; seconds: number; file: string }> =
  [];
function decode(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
function attr(tag: string, name: string) {
  return decode(new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? '');
}
for (const group of ['unidad', 'api']) {
  const xml = await readFile(resolve(directory, `${group}.xml`), 'utf8');
  for (const match of xml.matchAll(/<testcase\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    cases.push({
      group,
      name: attr(match[1], 'name'),
      status: match[2]?.includes('<failure')
        ? 'failed'
        : match[2]?.includes('<skipped')
          ? 'skipped'
          : 'passed',
      seconds: Number(attr(match[1], 'time')),
      file: attr(match[1], 'file'),
    });
  }
}
type Suite = {
  suites?: Suite[];
  specs?: Array<{
    title: string;
    file: string;
    tests: Array<{ projectName: string; results: Array<{ status: string; duration: number }> }>;
  }>;
};
const browser = JSON.parse(await readFile(resolve(directory, 'e2e.json'), 'utf8')) as Suite;
function walk(suite: Suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests) {
      const result = test.results.at(-1);
      cases.push({
        group: test.projectName,
        name: spec.title,
        status: result?.status ?? 'not-run',
        seconds: (result?.duration ?? 0) / 1000,
        file: spec.file,
      });
    }
  for (const child of suite.suites ?? []) walk(child);
}
walk(browser);
const groups = Object.fromEntries(
  [...new Set(cases.map((row) => row.group))].map((group) => {
    const rows = cases.filter((row) => row.group === group);
    return [
      group,
      {
        total: rows.length,
        passed: rows.filter((row) => row.status === 'passed').length,
        failed: rows.filter((row) => !['passed', 'skipped'].includes(row.status)).length,
        skipped: rows.filter((row) => row.status === 'skipped').length,
      },
    ];
  })
);
const coverage = [];
const lcov = await readFile(resolve(directory, 'coverage/lcov.info'), 'utf8');
for (const block of lcov.split('end_of_record')) {
  const file = /^SF:(.+)$/m.exec(block)?.[1];
  if (!file) continue;
  const normalized = file.replace(/\\/g, '/');
  if (!normalized.includes('/src/') && !normalized.startsWith('src/')) continue;
  const metric = (name: string) =>
    Number(new RegExp(`^${name}:(\\d+)$`, 'm').exec(block)?.[1] ?? 0);
  coverage.push({
    file,
    lines: metric('LF'),
    coveredLines: metric('LH'),
    functions: metric('FNF'),
    coveredFunctions: metric('FNH'),
  });
}
await mkdir(directory, { recursive: true });
await writeFile(
  resolve(directory, 'resumen.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), groups, coverage, cases }, null, 2)
);
const safe = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
await writeFile(
  resolve(directory, 'casos.md'),
  `# Casos ejecutados del CMS y sitio\n\nGenerado a partir de JUnit y del reporte final de Playwright.\n\n| Grupo | Caso | Resultado | Segundos |\n| --- | --- | --- | ---: |\n${cases.map((row) => `| ${safe(row.group)} | ${safe(row.name)} | ${row.status} | ${row.seconds.toFixed(2)} |`).join('\n')}\n`
);
console.log(JSON.stringify(groups, null, 2));
