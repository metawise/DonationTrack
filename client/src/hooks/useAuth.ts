import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string | null;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('auth_token')
  );

  const queryClient = useQueryClient();

  // Check if user is authenticated by validating token
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['/api/auth/me'],
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/me', undefined, {
          'Authorization': `Bearer ${token}`
        });
        return await response.json();
      } catch (error) {
        // Token is invalid, clear auth state
        setToken(null);
        localStorage.removeItem('auth_token');
        return null;
      }
    }
  });

  const login = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email });
      const data = await response.json();
      return { success: true, message: data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message.split(': ')[1] || error.message : 'Failed to send verification code'
      };
    }
  };

  const verifyCode = async (email: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiRequest('POST', '/api/auth/verify', { email, code });
      const data = await response.json();
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      queryClient.clear(); // Clear all cached queries to refetch with auth
      return { success: true, message: 'Successfully logged in' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message.split(': ')[1] || error.message : 'Invalid verification code'
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('POST', '/api/auth/logout', undefined, {
          'Authorization': `Bearer ${token}`
        });
      }
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      localStorage.removeItem('auth_token');
      queryClient.clear();
    }
  };

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading: isLoading && !!token,
    login,
    verifyCode,
    logout,
  };
}