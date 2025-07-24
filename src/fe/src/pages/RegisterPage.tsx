import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { z } from "zod";
import { Link, useNavigate } from "@tanstack/react-router";

const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(),
});

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const mutation = useMutation({
    mutationFn: (data: {
      username: string;
      email: string;
      password: string;
      full_name?: string;
    }) => register(data.username, data.email, data.password, data.full_name),
    onSuccess: () => {
      // Redirect to login page after successful registration
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 1500); // Small delay to show success message
    },
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
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
        Create your account
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
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your email"
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
        <div>
          <label
            className="block text-sm font-medium mb-2 text-gray-700"
            htmlFor="full_name"
          >
            Full Name (optional)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your full name"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Creating account..." : "Create account"}
        </button>
        {mutation.isError && (
          <p className="text-red-600 text-sm mt-2">{(mutation.error as any).message}</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-600 text-sm mt-2">
            Registration successful! Redirecting to login…
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </div>
  );
} 