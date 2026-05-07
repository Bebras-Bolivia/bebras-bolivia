import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
  ".gif",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

export class MediaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MediaError";
    this.status = status;
  }
}
