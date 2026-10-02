import { expect, test } from 'bun:test';
import { createSandbox } from '../helpers/sandbox';

test('API-PUBLISH-BASELINE [CMS-12 CMS-13] preview conserva cambios pendientes y programación evita autopublicación inmediata', async () => {
  const sandbox = await createSandbox();
  try {
    const schedule = await sandbox.request('/api/publish/schedule', 'POST', {
      runAt: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(schedule.status).toBe(200);
    const originalStatus = await (await sandbox.request('/api/publish/status')).json();
    const home = await (await sandbox.request('/api/content/home.json')).json();
    home.hero.title = 'Cambio reservado para publicación programada';
    expect((await sandbox.request('/api/content/home.json', 'PUT', home)).ok).toBe(true);
    expect((await sandbox.request('/api/preview/sync', 'POST')).ok).toBe(true);
    const changes = await (await sandbox.request('/api/publish/changes')).json();
    expect(changes.items).toContainEqual(
      expect.objectContaining({ file: 'home.json', status: 'modified' })
    );
    // Exceed the real two-second debounce to detect accidental early builds.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const status = await (await sandbox.request('/api/publish/status')).json();
    expect(status.isPublishing).toBe(false);
    expect(status.lastPublish).toEqual(originalStatus.lastPublish);
    const active = await (await sandbox.request('/api/publish/schedule')).json();
    expect(active.active.status).toBe('scheduled');
  } finally {
    await sandbox.close();
  }
}, 60000);
