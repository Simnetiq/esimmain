'use client';

import { usePathname } from 'next/navigation';

import Navbar from './Navbar';

const ConditionalNavbar = () => {
  const pathname = usePathname();
  
  // Hide navbar completely on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  // Show full navbar on login and register pages (same as other pages)
  if (pathname === '/login' || pathname === '/register') {
    return <Navbar />;
  }
  
  // Hide back button on dashboard page (but keep language selector)
  if (pathname === '/dashboard' || pathname?.match(/^\/[a-z]{2}\/dashboard$/)) {
    return <Navbar hideBackButton={true} />;
  }
  
  // Hide back button on landing page (root route) and payment success page
  const isLandingPage = pathname === '/';
  const isPaymentSuccessPage = pathname === '/payment-success';
  
  return <Navbar hideBackButton={isLandingPage || isPaymentSuccessPage} />;
};

export default ConditionalNavbar;
