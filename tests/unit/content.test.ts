import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  contentSchemas,
  certificateSchema,
  customPagesSchema,
  SharedPageComponentSchema,
} from '../../cms/src/content/schemas';
import { preserveDiacritics } from '../../cms/src/content/preserve-text';
import { parseSnapshotId } from '../../cms/src/snapshots/id';

describe('U-SCHEMA: contratos del almacén de contenido', () => {
  for (const [filename, schema] of Object.entries(contentSchemas)) {
    const fixture = JSON.parse(
      readFileSync(new URL(`../../src/data/${filename}`, import.meta.url), 'utf8')
    );
    test(`${filename}: contenido real válido`, () => {
      expect(schema.safeParse(fixture).success).toBe(true);
    });
    test(`${filename}: rechaza campos obligatorios ausentes y tipos incorrectos`, () => {
      expect(schema.safeParse({}).success).toBe(false);
      for (const key of Object.keys(fixture)) {
        const invalid = { ...fixture, [key]: 42 };
        expect(schema.safeParse(invalid).success).toBe(false);
      }
    });
  }
  test('logos: límite, dimensiones y protocolos', () => {
    const logo = { id: 'a', src: '/images/logo.webp', alt: 'Logo', height: 6 };
    expect(certificateSchema.safeParse({ logos: [logo] }).success).toBe(true);
    for (const height of [1, 13])
      expect(certificateSchema.safeParse({ logos: [{ ...logo, height }] }).success).toBe(false);
    expect(
      certificateSchema.safeParse({ logos: Array.from({ length: 9 }, () => logo) }).success
    ).toBe(false);
    for (const src of ['javascript:alert(1)', '//evil.test/x', 'data:image/png;base64,AA']) {
      expect(certificateSchema.safeParse({ logos: [{ ...logo, src }] }).success).toBe(false);
    }
  });
  test('páginas: slug seguro, único e igual al ID', () => {
    const page = {
      id: 'prueba',
      slug: 'prueba',
      title: 'Prueba',
      active: true,
      header: { tag: '', heading: '', subtitle: '' },
      components: [],
    };
    expect(customPagesSchema.safeParse({ pages: [page] }).success).toBe(true);
    expect(customPagesSchema.safeParse({ pages: [page, page] }).success).toBe(false);
    expect(customPagesSchema.safeParse({ pages: [{ ...page, slug: 'otra' }] }).success).toBe(false);
    expect(
      customPagesSchema.safeParse({ pages: [{ ...page, id: '../x', slug: '../x' }] }).success
    ).toBe(false);
  });
  test('componentes: rechaza enlaces ejecutables y tipos inexistentes', () => {
    expect(
      SharedPageComponentSchema.safeParse({
        type: 'cta',
        heading: '',
        text: '',
        buttonLabel: '',
        buttonHref: 'javascript:alert(1)',
      }).success
    ).toBe(false);
    expect(SharedPageComponentSchema.safeParse({ type: 'inventado' }).success).toBe(false);
  });
});

describe('U-TEXTO: conservación del contenido', () => {
  test('restaura tildes y eñe si solo se perdieron marcas', () => {
    expect(preserveDiacritics('Nina, accion y desafio', 'Niña, acción y desafío')).toBe(
      'Niña, acción y desafío'
    );
  });
  test('recorre objetos y arrays sin mutar el original', () => {
    const next = { heading: 'Ano', paragraphs: ['Educacion\nBolivia'], added: 'nuevo' };
    expect(
      preserveDiacritics(next, { heading: 'Año', paragraphs: ['Educación\nBolivia'] })
    ).toEqual({ heading: 'Año', paragraphs: ['Educación\nBolivia'], added: 'nuevo' });
    expect(next.heading).toBe('Ano');
  });
  test('una edición legítima no recupera el texto anterior', () => {
    expect(preserveDiacritics('Nueva edición', 'Edición anterior')).toBe('Nueva edición');
    expect(preserveDiacritics(null, 'anterior')).toBeNull();
    expect(preserveDiacritics(['nuevo'], {})).toEqual(['nuevo']);
  });
  test('UTF-8 JSON conserva saltos, tildes, eñe y caracteres no latinos', async () => {
    const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = await mkdtemp(join(tmpdir(), 'bebras-unit-'));
    try {
      const value = { text: 'Niña Muñoz: acción\nSegunda línea\n日本語' };
      await writeFile(join(dir, 'texto.json'), JSON.stringify(value, null, 2), 'utf8');
      expect(JSON.parse(await readFile(join(dir, 'texto.json'), 'utf8'))).toEqual(value);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('U-SNAPSHOT: identificadores', () => {
  test('acepta enteros positivos y mantiene su orden numérico', () => {
    expect(['1', '2', '10', '100'].map(parseSnapshotId)).toEqual([1, 2, 10, 100]);
    expect(parseSnapshotId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });
  test('rechaza formatos no canónicos y números inseguros', () => {
    for (const value of [
      null,
      1,
      '',
      '0',
      '01',
      '-1',
      '1.0',
      ' 1',
      '1e2',
      '../1',
      '9007199254740992',
    ])
      expect(parseSnapshotId(value)).toBeNull();
  });
});
