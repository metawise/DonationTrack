import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    currentPath: location
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🚪 Redirecting to login: not authenticated');
      window.location.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    console.log('⏳ ProtectedRoute: Loading authentication state...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ ProtectedRoute: User not authenticated, should redirect');
    return null; // Will redirect via useEffect
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
}