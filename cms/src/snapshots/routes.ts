import { Router, type Request, type Response } from "express";
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  SnapshotError,
} from "./service.js";

export const snapshotRouter = Router();

/**
 * GET /api/snapshots
 * List all snapshots.
 */
snapshotRouter.get("/", (_req: Request, res: Response) => {
  try {
    const snapshots = listSnapshots();
    res.json({ snapshots });
  } catch (err) {
    console.error("Error listing snapshots:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/snapshots
 * Create a snapshot of the current state.
 * Body: { description?: string }
 */
snapshotRouter.post("/", async (req: Request, res: Response) => {
  try {
    const description = req.body?.description ?? "";
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "Unknown";
    const meta = await createSnapshot(description, author);
    res.status(201).json(meta);
  } catch (err) {
    console.error("Error creating snapshot:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/snapshots/:id
 * Get snapshot details + file list.
 */
snapshotRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid snapshot ID" });
      return;
    }
    const snapshot = await getSnapshot(id);
    res.json(snapshot);
  } catch (err) {
    if (err instanceof SnapshotError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error getting snapshot:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /api/snapshots/:id/restore
 * Restore a snapshot to the current working directory.
 */
snapshotRouter.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid snapshot ID" });
      return;
    }
    const meta = await restoreSnapshot(id);
    res.json({ ok: true, restored: meta });
  } catch (err) {
    if (err instanceof SnapshotError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error restoring snapshot:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * DELETE /api/snapshots/:id
 * Delete a snapshot.
 */
snapshotRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid snapshot ID" });
      return;
    }
    await deleteSnapshot(id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof SnapshotError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error deleting snapshot:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
