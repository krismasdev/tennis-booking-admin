import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: "admin" | "vendor" | "user";
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (requiredRole) {
    if (requiredRole === "admin" && user.role !== "admin") {
      return (
        <Route path={path}>
          <Redirect to="/" />
        </Route>
      );
    }
    
    if (requiredRole === "vendor" && user.role !== "vendor" && user.role !== "admin") {
      return (
        <Route path={path}>
          <Redirect to="/" />
        </Route>
      );
    }
  }

  return <Route path={path} component={Component} />;
}
