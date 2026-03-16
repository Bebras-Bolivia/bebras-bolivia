import { resolve } from "path";

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Resolve all paths relative to the CMS project root (one level up from src/)
const CMS_ROOT = resolve(import.meta.dir, "..");

export const config = {
  port: parseInt(env("PORT", "4000"), 10),
  host: env("HOST", "0.0.0.0"),
  nodeEnv: env("NODE_ENV", "development"),
  isDev: env("NODE_ENV", "development") === "development",

  // Content directories
  contentDir: resolve(CMS_ROOT, env("CONTENT_DIR", "./content")),
  get currentDataDir() {
    return resolve(this.contentDir, "current/data");
  },
  get currentBlogDir() {
    return resolve(this.contentDir, "current/blog");
  },
  get snapshotsDir() {
    return resolve(this.contentDir, "snapshots");
  },
  get mediaDir() {
    return resolve(this.contentDir, "media");
  },

  // Landing project directories (Astro project is at repo root, one level up from cms/)
  landingDir: resolve(CMS_ROOT, env("LANDING_DIR", "..")),
  landingDataDir: resolve(CMS_ROOT, env("LANDING_DATA_DIR", "../src/data")),
  landingBlogDir: resolve(CMS_ROOT, env("LANDING_BLOG_DIR", "../src/content/blog")),
  landingPublicDir: resolve(CMS_ROOT, env("LANDING_PUBLIC_DIR", "../public")),

  // Auth
  jwtSecret: env("JWT_SECRET", "dev-secret-change-in-production"),
  jwtExpiry: env("JWT_EXPIRY", "24h"),
  cookieName: env("COOKIE_NAME", "bebras_cms_token"),

  // Initial admin
  adminEmail: env("ADMIN_EMAIL", "admin@bebras.bo"),
  adminPassword: env("ADMIN_PASSWORD", "admin123"),
  adminName: env("ADMIN_NAME", "Admin"),

  // Database
  get dbPath() {
    return resolve(this.contentDir, "cms.sqlite");
  },
} as const;
