import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@tanstack/react-router";

export default function HomeRedirect() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      navigate({ to: "/profile" });
    } else {
      navigate({ to: "/login" });
    }
  }, [accessToken]);

  return null;
} 