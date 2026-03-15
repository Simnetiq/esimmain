'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

const ConditionalNavbar = () => {
  const pathname = usePathname();

  // Hide navbar completely on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <Navbar />;
};

export default ConditionalNavbar;
