import { Outlet } from "@tanstack/react-router";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Outlet />
    </div>
  );
} 