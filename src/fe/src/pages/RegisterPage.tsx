import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { z } from "zod";
import { Link } from "@tanstack/react-router";

const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(),
});

export default function RegisterPage() {
  const { register } = useAuth();
  const mutation = useMutation({
    mutationFn: (data: {
      username: string;
      email: string;
      password: string;
      full_name?: string;
    }) => register(data.username, data.email, data.password, data.full_name),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const full_name = (formData.get("full_name") as string) || undefined;

    const parseResult = RegisterSchema.safeParse({
      username,
      email,
      password,
      full_name,
    });
    if (!parseResult.success) {
      alert(parseResult.error.issues[0].message);
      return;
    }
    mutation.mutate({ username, email, password, full_name });
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        Register
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            htmlFor="username"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            htmlFor="full_name"
          >
            Full Name (optional)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded focus:outline-none"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Registering..." : "Register"}
        </button>
        {mutation.isError && (
          <p className="text-red-500 text-sm">{(mutation.error as any).message}</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-600 text-sm">
            Registration successful! Redirecting to login…
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
      </p>
    </div>
  );
} 