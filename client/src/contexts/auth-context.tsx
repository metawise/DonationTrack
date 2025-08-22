import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data: authData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      console.log('🔍 Checking authentication status...');
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Important for session cookies
      });
      if (!response.ok) {
        console.log('❌ Auth check failed:', response.status);
        throw new Error('Not authenticated');
      }
      const data = await response.json();
      console.log('✅ Auth check successful:', data.user?.firstName);
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false, // Disable auto-refetch to prevent loops
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  useEffect(() => {
    if (authData?.user) {
      console.log('🔑 Auth context: User authenticated', authData.user);
      setUser(authData.user);
    } else if (error) {
      console.log('❌ Auth context: Authentication failed', error.message);
      setUser(null);
    }
  }, [authData, error]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace('/login');
    } catch (error) {
      // Fallback: just redirect to login
      window.location.replace('/login');
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}