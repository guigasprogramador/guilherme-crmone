"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRoles?: string[] | string;
  fallbackUrl?: string;
};

export default function ProtectedRoute({
  children,
  requiredRoles,
  fallbackUrl = "/dashboard",
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication check is complete
    if (!loading) {
      // If user is not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // If roles are required and user doesn't have permission, redirect to fallback
      if (requiredRoles && !hasPermission(requiredRoles)) {
        router.push(fallbackUrl);
      }
    }
  }, [loading, isAuthenticated, requiredRoles, hasPermission, router, fallbackUrl]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-60 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated or doesn't have permission, return null (redirects will handle this)
  if (!isAuthenticated || (requiredRoles && !hasPermission(requiredRoles))) {
    return null;
  }

  // Render children if authenticated and has permission
  return <>{children}</>;
}
