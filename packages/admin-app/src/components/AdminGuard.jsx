"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import Loading from './Loading';

const AdminGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {

      if (loading) {
        return;
      }

      // If user is not logged in, redirect to admin login
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // If user profile is not loaded yet, wait
      if (!userProfile) {
        return;
      }

      
      // Check if user has admin role
      const userRole = userProfile.role;
      
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        router.push('/login?error=access_denied');
        return;
      }

      setIsChecking(false);
    };

    checkAdminAccess();
  }, [currentUser, userProfile, loading, router]);

  // Show loading while checking permissions
  if (loading || isChecking) {
    return <Loading />;
  }

  // If user is not logged in or doesn't have admin access, don't render children
  if (!currentUser || (userProfile && userProfile.role !== 'admin' && userProfile.role !== 'super_admin')) {
    return null;
  }

  return children;
};

export default AdminGuard;
