import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  exportSnapshotArchive,
  importSnapshotArchive,
  SnapshotError,
} from "./service.js";

export const snapshotRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 1 },
});

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
    const description = String(req.body?.description ?? "").trim();
    if (description.length > 120) {
      res.status(400).json({ error: "Snapshot description too long" });
      return;
    }
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "Unknown";
    const meta = await createSnapshot(description, author);
    res.status(201).json(meta);
  } catch (err) {
    console.error("Error creating snapshot:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

snapshotRouter.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "Unknown";
    const meta = await importSnapshotArchive(file.buffer, author);
    res.status(201).json({ ok: true, snapshot: meta });
  } catch (err) {
    if (err instanceof SnapshotError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error importing snapshot:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

snapshotRouter.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid snapshot ID" });
      return;
    }
    const archive = await exportSnapshotArchive(id);
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename=\"${archive.filename}\"`);
    res.send(archive.buffer);
  } catch (err) {
    if (err instanceof SnapshotError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error exporting snapshot:", err);
      res.status(500).json({ error: "Internal server error" });
    }
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
