import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export interface TokenPayload extends JWTPayload {
  sub: string; // user id as string
  email: string;
  name: string;
}

/**
 * Create a signed JWT for the given user.
 */
export async function createToken(user: {
  id: number;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiry)
    .sign(secret);
}

/**
 * Verify a JWT and return its payload.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenPayload;
}

/**
 * Express middleware that verifies the JWT from the cookie.
 * On success, attaches `req.user` with { id, email, name }.
 * On failure, responds with 401.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[config.cookieName];

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = await verifyToken(token);
    // Attach user info to request
    (req as any).user = {
      id: parseInt(payload.sub!, 10),
      email: payload.email,
      name: payload.name,
    };

    // Refresh the token (sliding expiration)
    const newToken = await createToken({
      id: parseInt(payload.sub!, 10),
      email: payload.email,
      name: payload.name,
    });
    setCookieOnResponse(res, newToken);

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Set the JWT cookie on a response.
 */
export function setCookieOnResponse(res: Response, token: string): void {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
    path: "/",
  });
}

/**
 * Clear the auth cookie.
 */
export function clearCookie(res: Response): void {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: "strict",
    path: "/",
  });
}
