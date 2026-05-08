import { Router, type Request, type Response, type NextFunction } from "express";
import { getDb, type UserRow } from "../db/index.js";
import { verifyPassword } from "./passwords.js";
import {
  createToken,
  setCookieOnResponse,
  clearCookie,
  requireAuth,
} from "./middleware.js";

export const authRouter = Router();

// Simple in-memory rate limiter for sensitive endpoints (login, user creation).
// Tracks attempts per IP within a sliding window.
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_ATTEMPTS = 8;
const rateBuckets = new Map<string, number[]>();

function rateLimitByIp(req: Request, res: Response, next: NextFunction): void {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_ATTEMPTS) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  // Periodic cleanup to prevent unbounded growth.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  next();
}

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
authRouter.post("/login", rateLimitByIp, async (req: Request, res: Response) => {
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
