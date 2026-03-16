import { Router, type Request, type Response } from "express";
import multer from "multer";
import { resolve } from "path";
import { config } from "../config.js";
import { listMedia, deleteMedia, validateUpload, MediaError } from "./service.js";

// Configure multer to save to the media directory
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.mediaDir);
  },
  filename: (_req, file, cb) => {
    // Prefix with timestamp to avoid name collisions
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export const mediaRouter = Router();

/**
 * GET /api/media
 * List all uploaded media files.
 */
mediaRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const files = await listMedia();
    res.json({ files });
  } catch (err) {
    console.error("Error listing media:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/media/upload
 * Upload a single image file.
 */
mediaRouter.post(
  "/upload",
  upload.single("file"),
  (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      validateUpload(file);

      res.status(201).json({
        filename: file.filename,
        size: file.size,
        url: `/api/media/file/${file.filename}`,
      });
    } catch (err) {
      if (err instanceof MediaError) {
        res.status(err.status).json({ error: err.message });
      } else {
        console.error("Error uploading media:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

/**
 * GET /api/media/file/:filename
 * Serve a media file.
 */
mediaRouter.get("/file/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename as string;

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = resolve(config.mediaDir, filename);
  res.sendFile(filePath);
});

/**
 * DELETE /api/media/:filename
 * Delete a media file.
 */
mediaRouter.delete("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    await deleteMedia(filename);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof MediaError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error deleting media:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
