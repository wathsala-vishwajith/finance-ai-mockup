import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import api from "../lib/api";

interface AuthContextProps {
  accessToken: string | null;
  refreshToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    full_name?: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem("refresh_token")
  );

  const navigate = useNavigate();

  const saveTokens = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  };

  const login = async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    saveTokens(res.data.access_token, res.data.refresh_token);
    navigate({ to: "/" });
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    full_name?: string
  ) => {
    await api.post("/auth/register", { username, email, password, full_name });
    navigate({ to: "/login" });
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate({ to: "/login" });
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) throw new Error("No refresh token available");
    const res = await api.post("/auth/refresh", { refresh_token: refreshToken });
    saveTokens(res.data.access_token, res.data.refresh_token ?? refreshToken);
    return res.data.access_token;
  };

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && refreshToken) {
          try {
            const newAccess = await refreshAccessToken();
            error.config.headers.Authorization = `Bearer ${newAccess}`;
            return api.request(error.config);
          } catch (refreshErr) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshToken]);

  return (
    <AuthContext.Provider
      value={{ accessToken, refreshToken, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 