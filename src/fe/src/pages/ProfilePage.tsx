import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

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

export default function ProfilePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!accessToken) {
      navigate({ to: "/login" });
    }
  }, [accessToken]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get<UserProfile>("/auth/me");
      return res.data;
    },
    enabled: !!accessToken
  });

  if (isLoading) return <p className="text-gray-700 dark:text-gray-300">Loading…</p>;
  if (error) return <p className="text-red-500">Failed to load profile.</p>;

  const { user } = data!;

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        User Profile
      </h1>
      <div className="space-y-2 text-gray-800 dark:text-gray-200">
        <p>
          <span className="font-medium">Username:</span> {user.username}
        </p>
        <p>
          <span className="font-medium">Email:</span> {user.email}
        </p>
        {user.full_name && (
          <p>
            <span className="font-medium">Full Name:</span> {user.full_name}
          </p>
        )}
        <p>
          <span className="font-medium">Joined:</span> {new Date(user.created_at).toLocaleDateString()}
        </p>
        <p>
          <span className="font-medium">Active:</span> {user.is_active ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
} 