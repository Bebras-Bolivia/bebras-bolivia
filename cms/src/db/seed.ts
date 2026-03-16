/**
 * Seed script — creates the initial admin user if no users exist.
 * Run with: bun src/db/seed.ts
 */

import { getDb, type UserRow } from "./index.js";
import { hashPassword } from "../auth/passwords.js";
import { config } from "../config.js";

async function seed() {
  const db = getDb();

  const existing = db.query("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };

  if (existing.count > 0) {
    console.log(`Database already has ${existing.count} user(s). Skipping seed.`);
    return;
  }

  console.log("No users found. Creating initial admin user...");

  const hashed = await hashPassword(config.adminPassword);

  db.query("INSERT INTO users (email, name, password) VALUES (?, ?, ?)").run(
    config.adminEmail,
    config.adminName,
    hashed
  );

  const user = db
    .query("SELECT id, email, name, created_at FROM users WHERE email = ?")
    .get(config.adminEmail) as Pick<UserRow, "id" | "email" | "name" | "created_at">;

  console.log("Admin user created:");
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name:  ${user.name}`);
  console.log(`  Date:  ${user.created_at}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
