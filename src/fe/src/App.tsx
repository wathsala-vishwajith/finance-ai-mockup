import { Outlet } from "@tanstack/react-router";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient-light dark:animated-gradient-dark p-4">
      <Outlet />
    </div>
  );
} 