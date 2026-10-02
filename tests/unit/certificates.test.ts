import { afterEach, describe, expect, test } from 'bun:test';
import {
  deriveCertificateSecrets,
  encryptCertificate,
  normalizeCode as cmsNormalize,
} from '../../cms/src/certificates/crypto';
import {
  findCertificates,
  normalizeCode,
  type Certificate,
} from '../../src/lib/certificate-crypto';
import { distinctionOf } from '../../src/lib/certificate-distinction';

const certificate: Certificate = {
  contest: 'Desafío de prueba',
  year: 2026,
  issuedAt: null,
  participants: ['Niña Muñoz'],
  category: 'Kuntur',
  grade: null,
  school: null,
  place: null,
  department: null,
  score: 50,
  correct: 5,
  questions: 10,
  rank: null,
  rankOf: null,
};
const realFetch = globalThis.fetch;
function mockFetch(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  globalThis.fetch = Object.assign(handler, { preconnect: realFetch.preconnect });
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('U-CRIP: certificados CMS → sitio', () => {
  test('normalización idéntica', () => {
    for (const value of [' abcd-2345 ', 'ABCD2345', 'á.b c\n12', ''])
      expect(normalizeCode(value)).toBe(cmsNormalize(value));
  });
  test('derivación determinista y formato no identificable', async () => {
    const first = await deriveCertificateSecrets('ABCD2345');
    expect(await deriveCertificateSecrets(' abcd-2345 ')).toEqual(first);
    expect(first.fileId).toMatch(/^[0-9a-f]{32}$/);
    expect(Buffer.from(first.secret, 'base64').length).toBe(32);
    expect(await deriveCertificateSecrets('WXYZ6789')).not.toEqual(first);
  });
  test('el sitio pide el archivo derivado y descifra UTF-8', async () => {
    const { fileId, secret } = await deriveCertificateSecrets('ABCD2345');
    const file = await encryptCertificate(secret, [certificate]);
    mockFetch(async (url, options) => {
      expect(String(url)).toBe(`/certificados/${fileId}.json`);
      expect(options?.cache).toBe('no-store');
      return Response.json(file);
    });
    expect(await findCertificates(' abcd-2345 ')).toEqual([certificate]);
    expect(JSON.stringify(file)).not.toContain('Muñoz');
  });
  test('cada cifrado usa un IV distinto', async () => {
    const { secret } = await deriveCertificateSecrets('ABCD2345');
    const first = await encryptCertificate(secret, [certificate]);
    const second = await encryptCertificate(secret, [certificate]);
    expect(first.iv).not.toBe(second.iv);
    expect(first.data).not.toBe(second.data);
  });
  test('otro código no descifra ni un archivo interceptado', async () => {
    const { secret } = await deriveCertificateSecrets('ABCD2345');
    const file = await encryptCertificate(secret, [certificate]);
    mockFetch(async () => Response.json(file));
    expect(await findCertificates('WXYZ6789')).toBeNull();
  });
  test('autenticación AES rechaza datos alterados', async () => {
    const { secret } = await deriveCertificateSecrets('ABCD2345');
    const file = await encryptCertificate(secret, [certificate]);
    const bytes = Buffer.from(file.data, 'base64');
    bytes[0] ^= 1;
    mockFetch(async () => Response.json({ ...file, data: bytes.toString('base64') }));
    expect(await findCertificates('ABCD2345')).toBeNull();
  });
  test('404 significa código inexistente', async () => {
    mockFetch(async () => new Response(null, { status: 404 }));
    expect(await findCertificates('ABCD2345')).toBeNull();
  });
  test('500 comunica error de consulta', async () => {
    mockFetch(async () => new Response(null, { status: 500 }));
    await expect(findCertificates('ABCD2345')).rejects.toThrow('No se pudo buscar');
  });
  test('JSON mal formado no revela información', async () => {
    mockFetch(async () => new Response('no-json'));
    expect(await findCertificates('ABCD2345')).toBeNull();
  });
  test('archivo sin campos de cifrado se descarta', async () => {
    mockFetch(async () => Response.json({ v: 1 }));
    expect(await findCertificates('ABCD2345')).toBeNull();
  });
});

describe('U-DIST: distinción', () => {
  for (const rank of [1, 2, 3])
    test(`puesto ${rank}: excelencia`, () => {
      expect(distinctionOf({ ...certificate, rank, rankOf: 100 })).toEqual({
        kind: 'podium',
        rank,
      });
    });
  test('mérito en el límite del 10 %', () => {
    expect(distinctionOf({ ...certificate, rank: 10, rankOf: 100 })).toEqual({ kind: 'merit' });
    expect(distinctionOf({ ...certificate, rank: 11, rankOf: 100 })).toEqual({
      kind: 'participation',
    });
  });
  test('redondea hacia arriba categorías no múltiplos de diez', () => {
    expect(distinctionOf({ ...certificate, rank: 4, rankOf: 31 })).toEqual({ kind: 'merit' });
    expect(distinctionOf({ ...certificate, rank: 5, rankOf: 31 })).toEqual({
      kind: 'participation',
    });
  });
  test('categorías pequeñas y sin puesto: participación', () => {
    expect(distinctionOf({ ...certificate, rank: 4, rankOf: 9 })).toEqual({
      kind: 'participation',
    });
    expect(distinctionOf(certificate)).toEqual({ kind: 'participation' });
  });
  test('la elección manual prevalece incluso sobre el podio', () => {
    expect(distinctionOf({ ...certificate, rank: 1, distinction: 'participation' })).toEqual({
      kind: 'participation',
    });
    expect(distinctionOf({ ...certificate, rank: 1, distinction: 'merit' })).toEqual({
      kind: 'merit',
    });
  });
});
