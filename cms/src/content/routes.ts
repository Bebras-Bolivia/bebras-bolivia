import { Router, type Request, type Response } from "express";
import {
  listContentFiles,
  readContentFile,
  writeContentFile,
  ContentError,
  ContentValidationError,
} from "./service.js";
import { syncFileToLanding } from "../preview/service.js";
import { queueAutoPublish } from "../publish/service.js";

export const contentRouter = Router();

/**
 * GET /api/content
 * List all content file names.
 */
contentRouter.get("/", (_req: Request, res: Response) => {
  res.json({ files: listContentFiles() });
});

/**
 * GET /api/content/:filename
 * Read a content JSON file.
 */
contentRouter.get("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    const data = await readContentFile(filename);
    res.json(data);
  } catch (err) {
    if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error reading content:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * PUT /api/content/:filename
 * Write a content JSON file (validated against Zod schema).
 */
contentRouter.put("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    const result = await writeContentFile(filename, req.body);

    try {
      await syncFileToLanding(filename);
    } catch (syncErr) {
      console.error("Warning: failed to sync saved content to landing:", syncErr);
      // Don't fail the save — content was already written to CMS.
    }

    res.json({ ...result, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error writing content:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
