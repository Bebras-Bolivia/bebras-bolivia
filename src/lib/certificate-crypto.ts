// Mismo cálculo que `cms/src/certificates/crypto.ts`: si cambia uno, cambia el
// otro, o los estudiantes dejan de encontrar su certificado.
const SALT = "bebras-bolivia-certificado-v1";
const ITERATIONS = 100_000;

const encoder = new TextEncoder();

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export type Certificate = {
  contest: string;
  year: number;
  issuedAt: string | null;
  participants: string[];
  category: string;
  grade: string | null;
  school: string | null;
  place: string | null;
  department: string | null;
  score: number;
  correct: number;
  questions: number;
  rank: number | null;
  rankOf: number | null;
};

/** Busca y descifra los certificados de un código; `null` si no hay ninguno. */
export async function findCertificates(code: string): Promise<Certificate[] | null> {
  const base = await crypto.subtle.importKey("raw", encoder.encode(normalizeCode(code)), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(SALT), iterations: ITERATIONS }, base, 512)
  );
  const response = await fetch(`/certificados/${hex(bits.slice(0, 16))}.json`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo buscar el certificado.");
  const file = (await response.json().catch(() => null)) as { iv?: string; data?: string } | null;
  if (!file?.iv || !file.data) return null;
  try {
    const key = await crypto.subtle.importKey("raw", bits.slice(32), "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(file.iv) }, key, fromBase64(file.data));
    return JSON.parse(new TextDecoder().decode(plain)) as Certificate[];
  } catch {
    return null;
  }
}
