import { Router, type Request, type Response } from "express";
import {
  startDevServer,
  stopDevServer,
  getPreviewStatus,
  syncContentToLanding,
  PreviewError,
} from "./service.js";

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
