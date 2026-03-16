import { Router, type Request, type Response } from "express";
import { getDb, type UserRow } from "../db/index.js";
import { verifyPassword } from "./passwords.js";
import {
  createToken,
  setCookieOnResponse,
  clearCookie,
  requireAuth,
} from "./middleware.js";

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = getDb();
  const user = db
    .query("SELECT * FROM users WHERE email = ?")
    .get(email) as UserRow | null;

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await createToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  setCookieOnResponse(res, token);

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
});

/**
 * POST /api/auth/logout
 */
authRouter.post("/logout", (_req: Request, res: Response) => {
  clearCookie(res);
  res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * Requires authentication.
 */
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
});

/**
 * POST /api/auth/users
 * Create a new admin user (max 5). Requires authentication.
 * Body: { email: string, password: string, name: string }
 */
authRouter.post("/users", requireAuth, async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password, and name are required" });
    return;
  }

  const db = getDb();

  // Check max users
  const count = db.query("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  if (count.count >= 5) {
    res.status(400).json({ error: "Maximum of 5 admin users allowed" });
    return;
  }

  // Check duplicate email
  const existing = db
    .query("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    res.status(400).json({ error: "A user with this email already exists" });
    return;
  }

  const { hashPassword } = await import("./passwords.js");
  const hashed = await hashPassword(password);

  const result = db
    .query("INSERT INTO users (email, name, password) VALUES (?, ?, ?)")
    .run(email, name, hashed);

  res.status(201).json({
    user: { id: Number(result.lastInsertRowid), email, name },
  });
});
