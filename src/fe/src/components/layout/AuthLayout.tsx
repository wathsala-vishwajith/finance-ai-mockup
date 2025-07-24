import React from 'react';
import { Outlet } from '@tanstack/react-router';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and header */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">ST</span>
            </div>
            <span className="ml-3 text-gray-900 text-2xl font-bold">Fintech</span>
          </div>
          <p className="mt-4 text-gray-600">Secure financial management platform</p>
        </div>
        
        {/* Content */}
        <Outlet />
      </div>
    </div>
  );
} 