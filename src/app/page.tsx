'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useEffect } from 'react'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🔄 Root page effect:', { isLoading, isAuthenticated });
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('➡️ Redirecting to dashboard...');
        router.replace('/dashboard');
      } else {
        console.log('➡️ Redirecting to login...');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-spinner">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Jews for Jesus Donation System...</p>
        </div>
      </div>
    )
  }

  // This should not be reached due to the redirect, but provide fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}