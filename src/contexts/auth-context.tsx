'use client'

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
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Force initialization after 5 seconds if still loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.log('🚨 Auth timeout: Force initializing as not authenticated');
        setUser(null);
        setIsInitialized(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [isInitialized]);

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
    refetchOnWindowFocus: false,
    staleTime: 0, // Don't cache - always fresh
    gcTime: 0, // Don't keep in cache
  });

  useEffect(() => {
    console.log('📊 Auth state update:', { 
      hasAuthData: !!authData, 
      hasUser: !!authData?.user, 
      hasError: !!error, 
      isLoading, 
      isInitialized 
    });
    
    if (authData?.user) {
      console.log('🔑 Auth context: User authenticated', authData.user);
      setUser(authData.user);
      setIsInitialized(true);
    } else if (error) {
      console.log('❌ Auth context: Authentication failed', error?.message);
      setUser(null);
      setIsInitialized(true);
    } else if (!isLoading && authData && !authData.user) {
      console.log('❌ Auth context: No user in response');
      setUser(null);
      setIsInitialized(true);
    } else if (!isLoading && !authData) {
      console.log('❌ Auth context: No auth data received');
      setUser(null);
      setIsInitialized(true);
    }
  }, [authData, error, isLoading, isInitialized]);

  const refreshAuth = () => {
    refetch();
  };

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
  const authIsLoading = isLoading || !isInitialized;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading: authIsLoading, logout, refreshAuth }}>
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