import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Public routes that don't require authentication
const publicRoutes = [
  "/auth",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh", // Keep /api/auth/refresh public as client will call it
  "/api/auth/microsoft",
  "/api/auth/microsoft/callback",
];

// Function to check if a route is public
const isPublicRoute = (path: string) => {
  return publicRoutes.some((route) => path.startsWith(route)) || path.startsWith("/_next") || path.startsWith("/favicon.ico");
};

const JWT_SECRET_BYTES = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Check if it's a public route
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("redirect", encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search));


  // Scenario 1: accessToken is present
  if (accessToken) {
    try {
      await jwtVerify(accessToken, JWT_SECRET_BYTES);
      // Access token is valid, proceed
      return NextResponse.next();
    } catch (error) {
      // Access token verification failed (e.g., expired, invalid)
      console.log("Access token verification failed:", error.message);
      // If refresh token exists, let client-side handle refresh
      if (refreshToken) {
        console.log("Refresh token exists, deferring to client-side for refresh.");
        // It's important to allow the request to proceed so client-side can attempt refresh.
        // The client-side will hit the actual protected API, which will fail,
        // and then the client's error handling (e.g., in useAuth) should trigger refreshToken.
        return NextResponse.next();
      } else {
        // No refresh token, redirect to login
        console.log("No refresh token, redirecting to login.");
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  // Scenario 2: accessToken is NOT present
  else {
    if (refreshToken) {
      // No access token, but refresh token exists. Let client-side handle refresh.
      console.log("No access token, but refresh token exists. Deferring to client-side for refresh.");
      return NextResponse.next();
    } else {
      // No access token and no refresh token, redirect to login
      console.log("No access token and no refresh token, redirecting to login.");
      return NextResponse.redirect(loginUrl);
    }
  }
}

// Configuration for the middleware
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
