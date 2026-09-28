import { mkdir, readdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { queueAutoPublish } from "../publish/service.js";
import { deriveCertificateSecrets, encryptCertificate, normalizeCode } from "./crypto.js";
import { findSchool } from "./schools.js";

const SOURCE_KEY = "certificates.sourceUrl";
const SYNCED_KEY = "certificates.syncedAt";

export class CertificatesError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CertificatesError";
    this.status = status;
  }
}

const exportSchema = z.object({
  version: z.literal(1),
  contests: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      year: z.number().int(),
      resultsPublishedAt: z.string().nullable().optional(),
    })
  ),
  certificates: z.array(
    z.object({
      code: z.string().min(4).max(32),
      contestId: z.string().min(1),
      participants: z.array(z.string().min(1)).min(1).max(2),
      category: z.string(),
      grade: z.string().nullable(),
      school: z.string().nullable(),
      place: z.string().nullable(),
      department: z.string().nullable(),
      score: z.number(),
      correct: z.number(),
      questions: z.number(),
      rank: z.number().nullable(),
      rankOf: z.number().nullable(),
    })
  ),
});

type ExportedCertificate = z.infer<typeof exportSchema>["certificates"][number];

const CATEGORIES = ["Guacamayo", "Capibara", "Titi", "Jucumari", "Yaguareté", "Kuntur"] as const;
const DEPARTMENTS = ["la-paz", "cochabamba", "santa-cruz", "oruro", "potosi", "sucre", "tarija", "beni", "pando"] as const;
const DISTINCTIONS = ["participation", "merit", "1", "2", "3"] as const;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => value?.replace(/\s+/g, " ").trim() || null);

const manualSchema = z.object({
  name: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "Escribe el nombre de la persona.").max(80, "El nombre es demasiado largo.")),
  contest: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "Escribe el nombre del desafío.").max(120, "El nombre del desafío es demasiado largo.")),
  year: z.coerce.number({ invalid_type_error: "Escribe el año." }).int("Escribe el año.").min(2000, "Revisa el año.").max(2100, "Revisa el año."),
  category: z.enum(CATEGORIES).or(z.literal("")).optional(),
  grade: optionalText(40),
  schoolCode: optionalText(20),
  place: optionalText(120),
  department: z.enum(DEPARTMENTS).or(z.literal("")).optional(),
  distinction: z.enum(DISTINCTIONS, { errorMap: () => ({ message: "Elige el tipo de certificado." }) }),
  issuedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Revisa la fecha.")
    .or(z.literal(""))
    .optional(),
}).refine((input) => input.distinction === "participation" || Boolean(input.category), {
  message: "Elige la categoría: los certificados de lugar y de mención la muestran.",
});

type ContestRow = { id: string; title: string; year: number; results_published_at: string | null; synced_at: string };
type CertificateRow = { contest_id: string; code: string; data: string; file_id: string; secret: string };
type ManualRow = { code: string; data: string; file_id: string; secret: string; created_at: string };

type StoredCertificate = {
  contest: string;
  year: number;
  issuedAt: string | null;
  participants: string[];
  category: string;
  grade: string | null;
  school: string | null;
  place: string | null;
  department: string | null;
  rank: number | null;
  distinction?: "merit" | "participation";
};

function certificatesDir() {
  return join(config.landingPublicDir, "certificados");
}

function readSetting(key: string) {
  const row = getDb().query("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

function writeSetting(key: string, value: string) {
  getDb()
    .query("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(key, value);
}

export function getCertificatesState() {
  const db = getDb();
  const contests = db
    .query(
      `SELECT c.id, c.title, c.year, c.results_published_at, c.synced_at, COUNT(x.code) AS count
       FROM certificate_contests c LEFT JOIN certificates x ON x.contest_id = c.id
       GROUP BY c.id ORDER BY c.year DESC, c.title`
    )
    .all() as Array<ContestRow & { count: number }>;
  const manual = (db.query("SELECT code, data, created_at FROM manual_certificates ORDER BY created_at DESC, rowid DESC").all() as ManualRow[]).map(
    (row) => {
      const data = JSON.parse(row.data) as StoredCertificate;
      return {
        code: row.code,
        name: data.participants[0] ?? "",
        contest: data.contest,
        year: data.year,
        category: data.category,
        distinction: data.rank ? String(data.rank) : (data.distinction ?? "participation"),
        createdAt: row.created_at,
      };
    }
  );

  return {
    sourceUrl: readSetting(SOURCE_KEY),
    syncedAt: readSetting(SYNCED_KEY),
    total: contests.reduce((sum, contest) => sum + contest.count, 0) + manual.length,
    contests: contests.map((contest) => ({
      id: contest.id,
      title: contest.title,
      year: contest.year,
      count: contest.count,
      syncedAt: contest.synced_at,
    })),
    manual,
    siteUrl: config.siteUrl || null,
  };
}

function randomCode() {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 2))) {
      if (byte < limit && code.length < CODE_LENGTH) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

function uniqueCode() {
  const db = getDb();
  const taken = db.query("SELECT 1 FROM certificates WHERE code = ? UNION ALL SELECT 1 FROM manual_certificates WHERE code = ? LIMIT 1");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomCode();
    if (!taken.get(code, code)) return code;
  }
  throw new CertificatesError("No se pudo generar un código. Vuelve a intentar.", 500);
}

export async function addManualCertificate(raw: unknown, author: string) {
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CertificatesError(parsed.error.issues[0]?.message ?? "Revisa los datos del certificado.");
  }
  const input = parsed.data;
  const school = input.schoolCode ? findSchool(input.schoolCode) : null;
  if (input.schoolCode && !school) {
    throw new CertificatesError("Ese colegio no está en el catálogo. Búscalo de nuevo.");
  }
  const podium = input.distinction === "1" || input.distinction === "2" || input.distinction === "3";
  const certificate: StoredCertificate & { score: number; correct: number; questions: number; rankOf: null } = {
    contest: input.contest,
    year: input.year,
    issuedAt: input.issuedAt ? `${input.issuedAt}T12:00:00Z` : null,
    participants: [input.name],
    category: input.category ?? "",
    grade: input.grade,
    school: school?.name ?? null,
    place: input.place,
    department: school?.department ?? (input.department || null),
    score: 0,
    correct: 0,
    questions: 0,
    rank: podium ? Number(input.distinction) : null,
    rankOf: null,
    ...(podium ? {} : { distinction: input.distinction as "merit" | "participation" }),
  };

  const code = uniqueCode();
  const secrets = await deriveCertificateSecrets(code);
  getDb()
    .query("INSERT INTO manual_certificates (code, data, file_id, secret) VALUES (?, ?, ?, ?)")
    .run(code, JSON.stringify(certificate), secrets.fileId, secrets.secret);

  await writeCertificateFiles();
  queueAutoPublish(author);
  return { ...getCertificatesState(), code };
}

export async function removeManualCertificate(code: string, author: string) {
  const result = getDb().query("DELETE FROM manual_certificates WHERE code = ?").run(normalizeCode(code));
  if (!result.changes) {
    throw new CertificatesError("Ese certificado no está guardado.", 404);
  }
  await writeCertificateFiles();
  queueAutoPublish(author);
  return getCertificatesState();
}

export function saveSourceUrl(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CertificatesError("Pega el enlace completo que da el panel del concurso.");
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.pathname.endsWith("/api/certificates/export") || !url.searchParams.get("key")) {
    throw new CertificatesError("Ese no parece el enlace de certificados. Cópialo desde Administrador → Certificados en el concurso.");
  }
  writeSetting(SOURCE_KEY, url.toString());
  return getCertificatesState();
}

async function download(sourceUrl: string) {
  let response: Response;
  try {
    response = await fetch(sourceUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new CertificatesError("No se pudo conectar con el concurso. Revisa que esté en línea y vuelve a intentar.", 502);
  }
  if (response.status === 401) {
    throw new CertificatesError("El concurso rechazó el enlace: quizá lo cambiaron. Copia el nuevo desde su panel de administración.", 502);
  }
  if (!response.ok) {
    throw new CertificatesError(`El concurso respondió con un error (${response.status}). Vuelve a intentar más tarde.`, 502);
  }
  const parsed = exportSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new CertificatesError("La respuesta del concurso no tiene el formato esperado.", 502);
  }
  return parsed.data;
}

function publicCertificate(certificate: ExportedCertificate, contest: { title: string; year: number; resultsPublishedAt?: string | null }) {
  const { code: _code, contestId: _contestId, ...rest } = certificate;
  return { ...rest, contest: contest.title, year: contest.year, issuedAt: contest.resultsPublishedAt ?? null };
}

/**
 * Trae los certificados del concurso. Solo reemplaza los desafíos que vienen
 * en la respuesta: los de años anteriores quedan aunque el concurso ya no los
 * tenga.
 */
export async function syncCertificates(author: string) {
  const sourceUrl = readSetting(SOURCE_KEY);
  if (!sourceUrl) {
    throw new CertificatesError("Primero pega el enlace de certificados del concurso.");
  }
  const data = await download(sourceUrl);
  const db = getDb();

  const known = new Map(
    (db.query("SELECT code, file_id, secret FROM certificates").all() as Array<Pick<CertificateRow, "code" | "file_id" | "secret">>).map(
      (row) => [row.code, { fileId: row.file_id, secret: row.secret }]
    )
  );
  const missing = [...new Set(data.certificates.map((certificate) => normalizeCode(certificate.code)))].filter((code) => !known.has(code));
  for (let start = 0; start < missing.length; start += 64) {
    const batch = missing.slice(start, start + 64);
    const derived = await Promise.all(batch.map((code) => deriveCertificateSecrets(code)));
    batch.forEach((code, index) => known.set(code, derived[index]));
  }

  const contestsById = new Map(data.contests.map((contest) => [contest.id, contest]));
  const rows: CertificateRow[] = [];
  for (const certificate of data.certificates) {
    const contest = contestsById.get(certificate.contestId);
    if (!contest) continue;
    const code = normalizeCode(certificate.code);
    const secrets = known.get(code)!;
    rows.push({
      contest_id: contest.id,
      code,
      data: JSON.stringify(publicCertificate(certificate, contest)),
      file_id: secrets.fileId,
      secret: secrets.secret,
    });
  }

  const upsertContest = db.query(
    `INSERT INTO certificate_contests (id, title, year, results_published_at, synced_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, year = excluded.year, results_published_at = excluded.results_published_at, synced_at = excluded.synced_at`
  );
  const clearContest = db.query("DELETE FROM certificates WHERE contest_id = ?");
  const insert = db.query("INSERT OR REPLACE INTO certificates (contest_id, code, data, file_id, secret) VALUES (?, ?, ?, ?, ?)");
  db.transaction(() => {
    for (const contest of data.contests) {
      upsertContest.run(contest.id, contest.title, contest.year, contest.resultsPublishedAt ?? null);
      clearContest.run(contest.id);
    }
    for (const row of rows) insert.run(row.contest_id, row.code, row.data, row.file_id, row.secret);
  })();
  writeSetting(SYNCED_KEY, new Date().toISOString());

  await writeCertificateFiles();
  queueAutoPublish(author);
  return { ...getCertificatesState(), received: rows.length, receivedContests: data.contests.length };
}

export async function removeContest(id: string, author: string) {
  const result = getDb().query("DELETE FROM certificate_contests WHERE id = ?").run(id);
  if (!result.changes) {
    throw new CertificatesError("Ese desafío no está guardado.", 404);
  }
  await writeCertificateFiles();
  queueAutoPublish(author);
  return getCertificatesState();
}

/** Un archivo cifrado por código; si dos desafíos repiten un código, van juntos. */
export async function writeCertificateFiles() {
  const rows = getDb()
    .query("SELECT data, file_id, secret FROM certificates UNION ALL SELECT data, file_id, secret FROM manual_certificates")
    .all() as Array<Pick<CertificateRow, "data" | "file_id" | "secret">>;
  const byFile = new Map<string, { secret: string; items: unknown[] }>();
  for (const row of rows) {
    const entry = byFile.get(row.file_id) ?? { secret: row.secret, items: [] };
    entry.items.push(JSON.parse(row.data));
    byFile.set(row.file_id, entry);
  }

  const dir = certificatesDir();
  await mkdir(dir, { recursive: true });
  for (const [fileId, entry] of byFile) {
    await writeFile(join(dir, `${fileId}.json`), JSON.stringify(await encryptCertificate(entry.secret, entry.items)));
  }
  const existing = await readdir(dir);
  await Promise.all(
    existing
      .filter((file) => file.endsWith(".json") && !byFile.has(file.slice(0, -5)))
      .map((file) => rm(join(dir, file), { force: true }))
  );
}
