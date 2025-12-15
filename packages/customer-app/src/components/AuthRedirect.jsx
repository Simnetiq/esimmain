"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';

// Grid pattern style (consistent with other pages)
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

const AuthRedirect = ({ children, redirectTo = '/dashboard' }) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push(redirectTo);
    }
  }, [currentUser, loading, router, redirectTo]);

  // Show loading spinner while checking auth state - with min-h-screen
  if (loading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(to bottom right, rgba(83, 116, 205, 0.08), rgba(240, 249, 255, 0.4), rgba(255, 255, 255, 1))' }}
      >
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.1)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.08)' }} />
        
        {/* Grid Pattern */}
        <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
        
        <div className="relative text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if user is logged in - show loading while redirecting
  if (!loading && currentUser) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(to bottom right, rgba(83, 116, 205, 0.08), rgba(240, 249, 255, 0.4), rgba(255, 255, 255, 1))' }}
      >
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.1)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.08)' }} />
        
        <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
        
        <div className="relative text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthRedirect;
