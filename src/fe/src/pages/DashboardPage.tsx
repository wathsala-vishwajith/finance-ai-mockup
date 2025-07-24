import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  user: {
    id: number;
    username: string;
    email: string;
    full_name?: string | null;
    created_at: string;
    is_active: boolean;
  };
}

export default function DashboardPage() {
  const { accessToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get<UserProfile>("/auth/me");
      return res.data;
    },
    enabled: !!accessToken
  });

  const userName = data?.user?.full_name || data?.user?.username || 'Friend';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] w-full overflow-hidden">
      {/* Centered Animated Welcome Message */}
      <div className="text-center px-4 w-full max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient bg-300% leading-normal break-words hyphens-auto whitespace-normal">
          Hi {userName}, Welcome to the future of Fintech
        </h1>
      </div>
    </div>
  );
} 