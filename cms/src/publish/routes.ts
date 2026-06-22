import { Router, type Request, type Response } from "express";
import {
  cancelScheduledPublish,
  getPublishSchedule,
  getPublishStatus,
  getUnpublishedChanges,
  publish,
  PublishError,
  schedulePublish,
} from "./service.js";

export const publishRouter = Router();

/**
 * GET /api/publish/status
 * Check publish status (is building? last result?).
 */
publishRouter.get("/status", (_req: Request, res: Response) => {
  try {
    const status = getPublishStatus();
    res.json(status);
  } catch (err) {
    console.error("Error getting publish status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

publishRouter.get("/changes", async (_req: Request, res: Response) => {
  try {
    res.json(await getUnpublishedChanges());
  } catch (err) {
    console.error("Error getting unpublished changes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

publishRouter.get("/schedule", (_req: Request, res: Response) => {
  try {
    res.json(getPublishSchedule());
  } catch (err) {
    console.error("Error getting publish schedule:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

publishRouter.post("/schedule", (req: Request, res: Response) => {
  try {
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "Unknown";
    const runAt = typeof req.body?.runAt === "string" ? req.body.runAt : "";
    res.json({ ok: true, scheduled: schedulePublish(runAt, author) });
  } catch (err) {
    if (err instanceof PublishError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error scheduling publish:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

publishRouter.delete("/schedule/:id", (req: Request, res: Response) => {
  try {
    res.json({ ok: true, scheduled: cancelScheduledPublish(Number(req.params.id)) });
  } catch (err) {
    if (err instanceof PublishError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error cancelling scheduled publish:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /api/publish
 * Run the full publish flow (snapshot + copy + build).
 */
publishRouter.post("/", async (req: Request, res: Response) => {
  try {
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "Unknown";
    const result = await publish(author);
    res.json({ ok: true, publish: result });
  } catch (err) {
    if (err instanceof PublishError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error publishing:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
