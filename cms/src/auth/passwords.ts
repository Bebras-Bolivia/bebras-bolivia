/**
 * Password hashing using Bun's built-in Argon2id.
 */

export async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, {
    algorithm: "argon2id",
    memoryCost: 65536, // 64 MB
    timeCost: 2,
  });
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return Bun.password.verify(plain, hash);
}
