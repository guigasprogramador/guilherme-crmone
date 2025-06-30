"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[] | string;
  fallbackUrl?: string;
}

/**
 * Component to protect routes based on user roles
 * Use this to wrap pages that require specific roles for access
 */
export default function RoleProtectedRoute({
  children,
  allowedRoles,
  fallbackUrl = "/dashboard",
}: RoleProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasPermission } = useAuth();
  const router = useRouter();

  // Convert single role to array for consistency
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  useEffect(() => {
    // Only check after auth is loaded and user is authenticated
    if (!loading && isAuthenticated && !hasPermission(roles)) {
      router.push(fallbackUrl);
    }
  }, [loading, isAuthenticated, roles, hasPermission, router, fallbackUrl]);

  // Show no content while loading
  if (loading) {
    return null;
  }

  // Show access denied if authenticated but no permission
  if (isAuthenticated && !hasPermission(roles)) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página.
          </AlertDescription>
          <Button 
            onClick={() => router.push(fallbackUrl)} 
            variant="outline" 
            size="sm" 
            className="mt-4">
            Voltar para página principal
          </Button>
        </Alert>
      </div>
    );
  }

  // If not authenticated, useAuth will handle redirection to login
  if (!isAuthenticated) {
    return null;
  }

  // User has permission, render children
  return <>{children}</>;
}
