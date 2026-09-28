// Mismo cálculo que `src/lib/certificate-crypto.ts` del sitio: si cambia uno,
// cambia el otro, o los estudiantes dejan de encontrar su certificado.
const SALT = "bebras-bolivia-certificado-v1";
const ITERATIONS = 100_000;

const encoder = new TextEncoder();

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Del código personal salen el nombre del archivo y la clave que lo cifra: sin
 * el código no se puede saber qué archivo es de quién ni leerlo.
 */
export async function deriveCertificateSecrets(code: string) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(normalizeCode(code)), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(SALT), iterations: ITERATIONS }, base, 512)
  );
  return { fileId: hex(bits.slice(0, 16)), secret: Buffer.from(bits.slice(32)).toString("base64") };
}

export async function encryptCertificate(secret: string, value: unknown) {
  const key = await crypto.subtle.importKey("raw", Buffer.from(secret, "base64"), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value)));
  return { v: 1, iv: Buffer.from(iv).toString("base64"), data: Buffer.from(data).toString("base64") };
}
