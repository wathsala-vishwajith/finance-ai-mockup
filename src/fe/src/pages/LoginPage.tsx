import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { z } from "zod";
import { Link } from "@tanstack/react-router";

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const mutation = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      login(data.username, data.password),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const parseResult = LoginSchema.safeParse({ username, password });
    if (!parseResult.success) {
      alert(parseResult.error.issues[0].message);
      return;
    }
    mutation.mutate({ username, password });
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
        Sign in to your account
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
        <div>
          <label
            className="block text-sm font-medium mb-2 text-gray-700"
            htmlFor="username"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your username"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-2 text-gray-700"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </button>
        {mutation.isError && (
          <p className="text-red-600 text-sm mt-2">{(mutation.error as any).message}</p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign up
        </Link>
      </p>
    </div>
  );
} 