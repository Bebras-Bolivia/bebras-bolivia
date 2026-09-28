import { Router, type Request, type Response } from "express";
import {
  addManualCertificate,
  CertificatesError,
  getCertificatesState,
  removeContest,
  removeManualCertificate,
  saveSourceUrl,
  syncCertificates,
} from "./service.js";
import { searchSchools } from "./schools.js";

export const certificatesRouter = Router();

function authorOf(req: Request) {
  return (req as Request & { user?: { name?: string } }).user?.name ?? "CMS";
}

function fail(res: Response, err: unknown) {
  if (err instanceof CertificatesError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("[Certificates]", err);
  res.status(500).json({ error: "No se pudo completar la operación." });
}

let syncing = false;

certificatesRouter.get("/", (_req, res) => {
  try {
    res.json(getCertificatesState());
  } catch (err) {
    fail(res, err);
  }
});

certificatesRouter.put("/source", (req, res) => {
  try {
    res.json(saveSourceUrl(req.body?.url));
  } catch (err) {
    fail(res, err);
  }
});

certificatesRouter.post("/sync", async (req, res) => {
  if (syncing) {
    res.status(409).json({ error: "Ya se están actualizando los certificados." });
    return;
  }
  syncing = true;
  try {
    res.json(await syncCertificates(authorOf(req)));
  } catch (err) {
    fail(res, err);
  } finally {
    syncing = false;
  }
});

certificatesRouter.delete("/contests/:id", async (req, res) => {
  try {
    res.json(await removeContest(String(req.params.id), authorOf(req)));
  } catch (err) {
    fail(res, err);
  }
});

certificatesRouter.post("/manual", async (req, res) => {
  try {
    res.status(201).json(await addManualCertificate(req.body, authorOf(req)));
  } catch (err) {
    fail(res, err);
  }
});

certificatesRouter.delete("/manual/:code", async (req, res) => {
  try {
    res.json(await removeManualCertificate(String(req.params.code), authorOf(req)));
  } catch (err) {
    fail(res, err);
  }
});

certificatesRouter.get("/schools", (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const dep = typeof req.query.dep === "string" ? req.query.dep : "";
    res.json(searchSchools(q, dep || undefined));
  } catch (err) {
    fail(res, err);
  }
});
