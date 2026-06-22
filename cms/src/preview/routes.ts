import { Router, type Request, type Response } from "express";
import {
  startDevServer,
  stopDevServer,
  getPreviewStatus,
  syncContentToLanding,
  syncDraftToLanding,
  syncBlogDraftToLanding,
  cleanupBlogDraftPreview,
  syncSnapshotToLanding,
  getBlogPreviewSlug,
  PreviewError,
} from "./service.js";
import { getSnapshot } from "../snapshots/service.js";

export const previewRouter = Router();

/**
 * GET /api/preview/status
 * Check if the Astro dev server is running.
 */
previewRouter.get("/status", (_req: Request, res: Response) => {
  try {
    const status = getPreviewStatus();
    res.json(status);
  } catch (err) {
    console.error("Error getting preview status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/preview/start
 * Start the Astro dev server (if not already running).
 * Syncs content to landing first, then spawns `astro dev`.
 */
previewRouter.post("/start", async (_req: Request, res: Response) => {
  console.log("[DEBUG] POST /start handler reached");
  try {
    const result = await startDevServer();
    res.json(result);
  } catch (err) {
    if (err instanceof PreviewError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error starting dev server:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /api/preview/stop
 * Stop the Astro dev server.
 */
previewRouter.post("/stop", (_req: Request, res: Response) => {
  try {
    const result = stopDevServer();
    res.json(result);
  } catch (err) {
    console.error("Error stopping dev server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/preview/sync
 * Sync all CMS content to the landing directory (triggers HMR).
 */
previewRouter.post("/sync", async (_req: Request, res: Response) => {
  try {
    await syncContentToLanding();
    res.json({ ok: true });
  } catch (err) {
    console.error("Error syncing content:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

previewRouter.post("/snapshot/cleanup", async (_req: Request, res: Response) => {
  try {
    await syncContentToLanding();
    res.json({ ok: true });
  } catch (err) {
    console.error("Error cleaning snapshot preview:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

previewRouter.post("/snapshot/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid snapshot ID" });
    }

    const snapshot = await getSnapshot(id);
    await syncSnapshotToLanding(snapshot.dirName);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof PreviewError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error syncing snapshot preview:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /api/preview/draft
 * Sync an unsaved editor draft to landing preview data.
 */
previewRouter.post("/draft", async (req: Request, res: Response) => {
  try {
    const { filename, data } = req.body ?? {};
    if (!filename || data === undefined) {
      return res.status(400).json({ error: "filename and data are required" });
    }

    await syncDraftToLanding(String(filename), data);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof PreviewError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error syncing draft preview:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

previewRouter.post("/blog-draft", async (req: Request, res: Response) => {
  try {
    const { slug, frontmatter, body, usePreviewSlug } = req.body ?? {};
    if (frontmatter === undefined || body === undefined) {
      return res.status(400).json({ error: "frontmatter and body are required" });
    }

    const useTempSlug = Boolean(usePreviewSlug);
    const previewSlug = await syncBlogDraftToLanding(String(slug || ""), frontmatter, String(body || ""), useTempSlug);
    res.json({ ok: true, slug: useTempSlug ? getBlogPreviewSlug() : previewSlug });
  } catch (err) {
    if (err instanceof PreviewError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error syncing blog draft preview:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

previewRouter.post("/blog-draft/cleanup", async (_req: Request, res: Response) => {
  try {
    await cleanupBlogDraftPreview();
    await syncContentToLanding();
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof PreviewError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error cleaning blog draft preview:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
