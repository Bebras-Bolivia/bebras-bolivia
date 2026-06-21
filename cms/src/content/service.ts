import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";
import { contentSchemas, CONTENT_FILES } from "./schemas.js";
import { preserveDiacritics } from "./preserve-text.js";

/**
 * List all content file names.
 */
export function listContentFiles(): string[] {
  return [...CONTENT_FILES];
}

/**
 * Read a content JSON file from the current data directory.
 * Falls back to the landing source data directory if the CMS working copy doesn't exist yet.
 */
export async function readContentFile(filename: string): Promise<unknown> {
  if (!CONTENT_FILES.includes(filename)) {
    throw new ContentError(`Unknown content file: ${filename}`, 404);
  }

  // Try CMS working copy first, then landing source
  const cmsPath = join(config.currentDataDir, filename);
  const landingPath = join(config.landingDataDir, filename);

  let raw: string;
  try {
    raw = await readFile(cmsPath, "utf-8");
  } catch {
    // Fallback to landing source
    try {
      raw = await readFile(landingPath, "utf-8");
    } catch {
      throw new ContentError(`Content file not found: ${filename}`, 404);
    }
  }

  return JSON.parse(raw);
}

/**
 * Write a content JSON file to the CMS working copy.
 * Validates against the Zod schema before writing.
 */
export async function writeContentFile(
  filename: string,
  data: unknown
): Promise<{ ok: true }> {
  if (!CONTENT_FILES.includes(filename)) {
    throw new ContentError(`Unknown content file: ${filename}`, 404);
  }

  const referenceData = await readReferenceContentFile(filename);
  const schema = contentSchemas[filename];
  const result = schema.safeParse(preserveDiacritics(data, referenceData));

  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ContentValidationError(
      `Validation failed: ${details}`,
      details
    );
  }

  const filePath = join(config.currentDataDir, filename);
  await writeFile(filePath, JSON.stringify(result.data, null, 2) + "\n", "utf-8");

  return { ok: true };
}

async function readReferenceContentFile(filename: string): Promise<unknown> {
  for (const dir of [config.landingDataDir, config.currentDataDir]) {
    try {
      return JSON.parse(await readFile(join(dir, filename), "utf-8"));
    } catch {
      // Missing or invalid reference data should not block saving.
    }
  }

  return null;
}

/**
 * Custom error class with HTTP status code.
 */
export class ContentError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ContentError";
    this.status = status;
  }
}

export class ContentValidationError extends ContentError {
  details: string;
  constructor(message: string, details: string) {
    super(message, 400);
    this.name = "ContentValidationError";
    this.details = details;
  }
}
