import {
  createSnapshot,
  applyRetentionPolicy,
  listSnapshots,
} from '../../cms/src/snapshots/service';
import { getDb } from '../../cms/src/db';
import { config } from '../../cms/src/config';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
const manual = await createSnapshot('Manual antiguo', 'Pruebas');
const auto1 = await createSnapshot('Auto 1', 'Sistema');
const auto2 = await createSnapshot('Auto 2', 'Sistema');
for (const [snapshot, date] of [
  [manual, '2020-01-01T12:00:00Z'],
  [auto1, '2026-09-20T12:00:00Z'],
  [auto2, '2026-09-20T13:00:00Z'],
] as const) {
  await writeFile(
    join(config.snapshotsDir, snapshot.dirName, 'meta.json'),
    JSON.stringify({ ...snapshot, createdAt: date, automatic: snapshot.id !== manual.id })
  );
  getDb().query('UPDATE snapshots SET created_at = ? WHERE id = ?').run(date, snapshot.id);
}
const removed = await applyRetentionPolicy(new Date('2026-09-29T12:00:00Z'));
assert(removed.includes(auto1.id));
assert(!removed.includes(manual.id));
const remaining = await listSnapshots();
assert(remaining.some((s) => s.id === manual.id));
assert(remaining.some((s) => s.id === auto2.id));
getDb().close();
console.log('RETENCION OK');
