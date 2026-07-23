import { readFile, readdir, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { config } from "../config.js";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const SPONSOR_MEDIA_PREFIX = "sponsor__";

const svgWindow = new JSDOM("").window;
const svgSanitizer = createDOMPurify(svgWindow);

svgSanitizer.addHook("uponSanitizeAttribute", (_node, data) => {
  const name = data.attrName.toLowerCase();
  const value = data.attrValue.trim();

  if ((name === "href" || name === "xlink:href") && !value.startsWith("#")) {
    data.keepAttr = false;
  }

  if (/url\s*\(\s*(?!["']?#)/i.test(value)) {
    data.keepAttr = false;
  }
});

export interface MediaFile {
  filename: string;
  size: number;
  url: string;
}

/**
 * List all uploaded media files.
 */
export async function listMedia(): Promise<MediaFile[]> {
  const dir = config.mediaDir;
  let files: string[];

  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const media: MediaFile[] = [];
  for (const file of files) {
    // Sponsor uploads share storage but are intentionally hidden from the blog gallery.
    if (file.startsWith(SPONSOR_MEDIA_PREFIX)) continue;
    const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    try {
      const info = await stat(join(dir, file));
      media.push({
        filename: file,
        size: info.size,
        url: `/images/uploads/${file}`,
      });
    } catch {
      continue;
    }
  }

  return media;
}

/**
 * Delete a media file.
 */
export async function deleteMedia(filename: string): Promise<void> {
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new MediaError("Invalid filename", 400);
  }

  const filePath = join(config.mediaDir, filename);
  try {
    await unlink(filePath);
  } catch {
    throw new MediaError(`File not found: ${filename}`, 404);
  }
}

/**
 * Validate an uploaded file.
 */
export function validateUpload(file: {
  originalname: string;
  size: number;
}): void {
  const ext = file.originalname
    .substring(file.originalname.lastIndexOf("."))
    .toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new MediaError(
      `File type not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      400
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new MediaError(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
  }
}

export function sanitizeSvg(source: string): string {
  const clean = String(
    svgSanitizer.sanitize(source, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed", "style"],
      FORBID_ATTR: ["style"],
    })
  ).trim();

  if (!/^<svg(?:\s|>)/i.test(clean)) {
    throw new MediaError("El archivo no contiene un SVG válido", 400);
  }

  return clean;
}

export async function prepareUpload(file: {
  originalname: string;
  size: number;
  path: string;
}): Promise<void> {
  validateUpload(file);

  if (!file.originalname.toLowerCase().endsWith(".svg")) return;

  const source = await readFile(file.path, "utf-8");
  const clean = sanitizeSvg(source);
  await writeFile(file.path, clean, "utf-8");
}

export class MediaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MediaError";
    this.status = status;
  }
}
