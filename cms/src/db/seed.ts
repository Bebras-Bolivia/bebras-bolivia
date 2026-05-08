/**
 * Seed script — creates the initial admin user if no users exist.
 * Run with: bun src/db/seed.ts
 */

import { syncConfiguredAdmin } from "./admin.js";

async function seed() {
  const user = await syncConfiguredAdmin();

  console.log("Configured admin synced:");
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name:  ${user.name}`);
  console.log(`  Date:  ${user.created_at}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
