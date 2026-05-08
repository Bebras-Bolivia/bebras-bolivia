import { config } from "../config.js";
import { hashPassword } from "../auth/passwords.js";
import { getDb, type UserRow } from "./index.js";

export async function syncConfiguredAdmin(): Promise<UserRow> {
  const db = getDb();

  const existingConfiguredAdmin = db
    .query("SELECT * FROM users WHERE email = ?")
    .get(config.adminEmail) as UserRow | null;

  if (existingConfiguredAdmin) {
    return existingConfiguredAdmin;
  }

  const anyUser = db.query("SELECT 1 as v FROM users LIMIT 1").get() as { v: number } | null;
  if (anyUser) {
    throw new Error(
      `Configured admin email "${config.adminEmail}" not found, and other users already exist. Refusing to overwrite an existing account. Create the admin manually via /api/auth/users or update ADMIN_EMAIL to match an existing user.`
    );
  }

  const hashed = await hashPassword(config.adminPassword);
  const result = db.query("INSERT INTO users (email, name, password) VALUES (?, ?, ?)").run(
    config.adminEmail,
    config.adminName,
    hashed
  );

  return db.query("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid)) as UserRow;
}
