'use client';
import { logger } from '@/lib/logger';

import React from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  label: string;
}

export default function LogoutButton({ label }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any potential local storage or state if needed
      // Force a hard redirect to login to ensure all state is cleared
      window.location.href = '/login';
    } catch (error) {
      logger.error('Logout failed:', error);
      // Fallback redirect
      router.push('/login');
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
    >
      <LogOut size={16} /> {label}
    </button>
  );
}
