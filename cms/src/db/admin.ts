import { config } from "../config.js";
import { hashPassword } from "../auth/passwords.js";
import { getDb, type UserRow } from "./index.js";

export async function syncConfiguredAdmin(): Promise<UserRow> {
  const db = getDb();
  const hashed = await hashPassword(config.adminPassword);

  const existingConfiguredAdmin = db
    .query("SELECT * FROM users WHERE email = ?")
    .get(config.adminEmail) as UserRow | null;

  if (existingConfiguredAdmin) {
    db.query("UPDATE users SET name = ?, password = ?, updated_at = datetime('now') WHERE id = ?").run(
      config.adminName,
      hashed,
      existingConfiguredAdmin.id
    );
    return db.query("SELECT * FROM users WHERE id = ?").get(existingConfiguredAdmin.id) as UserRow;
  }

  const firstUser = db.query("SELECT * FROM users ORDER BY id LIMIT 1").get() as UserRow | null;

  if (firstUser) {
    db.query("UPDATE users SET email = ?, name = ?, password = ?, updated_at = datetime('now') WHERE id = ?").run(
      config.adminEmail,
      config.adminName,
      hashed,
      firstUser.id
    );
    return db.query("SELECT * FROM users WHERE id = ?").get(firstUser.id) as UserRow;
  }

  const result = db.query("INSERT INTO users (email, name, password) VALUES (?, ?, ?)").run(
    config.adminEmail,
    config.adminName,
    hashed
  );

  return db.query("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid)) as UserRow;
}
