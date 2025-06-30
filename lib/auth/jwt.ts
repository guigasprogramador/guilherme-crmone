import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";

// JWT secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

// Interface for JWT payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate an access token for a user
 */
export function generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp">) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Generate both access and refresh tokens for a user
 */
export function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  const refreshToken = generateRefreshToken(user.id);
  
  return { accessToken, refreshToken };
}

/**
 * Verify a JWT token and return the payload
 * Compatible with NextJS middleware
 */
export async function verifyJwtToken(token: string): Promise<JwtPayload | null> {
  try {
    const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    
    return payload as unknown as JwtPayload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error("Refresh token verification error:", error);
    return null;
  }
}
