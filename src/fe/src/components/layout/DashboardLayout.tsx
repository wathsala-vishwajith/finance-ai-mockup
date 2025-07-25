import React, { useState } from 'react';
import { Outlet, Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '../../context/AuthContext';
import {
  Bars3Icon,
  BellIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  TableCellsIcon,
  HomeIcon,
  UserIcon,
  CogIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, current: true },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, current: false },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, current: false },
  { name: 'Data', href: '/data', icon: TableCellsIcon, current: false },
  { name: 'Settings', href: '/settings', icon: CogIcon, current: false },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout, accessToken } = useAuth();
  const location = useLocation();

  // Update current navigation based on current path
  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: location.pathname === item.href,
  }));

  const handleLogout = () => {
    logout();
  };

  if (!accessToken) {
    return null; // This layout should only render for authenticated users
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div
          className={classNames(
            'fixed inset-y-0 left-0 z-50 bg-indigo-700 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
            sidebarCollapsed ? 'w-16' : 'w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo section */}
            <div className="flex items-center justify-between px-4 py-4 bg-indigo-800">
              <div className="flex items-center min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ST</span>
                </div>
                {!sidebarCollapsed && (
                  <span className="ml-3 text-white text-xl font-semibold truncate">Fintech</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Desktop collapse toggle */}
                <button
                  type="button"
                  className="hidden lg:block text-indigo-200 hover:text-white p-1"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  <span className="sr-only">Toggle sidebar</span>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sidebarCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M3 12h18" />
                    )}
                  </svg>
                </button>
                {/* Mobile close button */}
                <button
                  type="button"
                  className="lg:hidden text-indigo-200 hover:text-white p-1"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-6 space-y-1">
              {updatedNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    item.current
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-100 hover:bg-indigo-600 hover:text-white',
                    'group flex items-center text-sm font-medium rounded-md transition-all duration-200',
                    sidebarCollapsed 
                      ? 'px-2 py-3 justify-center' 
                      : 'px-2 py-2'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={classNames(
                      'h-6 w-6 flex-shrink-0',
                      sidebarCollapsed ? '' : 'mr-3'
                    )}
                    aria-hidden="true"
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              ))}
            </nav>

            {/* User section */}
            <div className="border-t border-indigo-600 p-2">
              <button
                onClick={handleLogout}
                className={classNames(
                  'w-full flex items-center text-sm font-medium text-indigo-100 hover:bg-indigo-600 hover:text-white rounded-md transition-all duration-200',
                  sidebarCollapsed 
                    ? 'px-2 py-3 justify-center' 
                    : 'px-2 py-2'
                )}
                title={sidebarCollapsed ? 'Sign out' : undefined}
              >
                <svg
                  className={classNames(
                    'h-6 w-6 flex-shrink-0',
                    sidebarCollapsed ? '' : 'mr-3'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {!sidebarCollapsed && (
                  <span className="truncate">Sign out</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:pl-0">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <button
                  type="button"
                  className="lg:hidden text-gray-500 hover:text-gray-900"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
                <h1 className="ml-2 lg:ml-0 text-2xl font-semibold text-gray-900">
                  Fintech Dashboard
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                </button>
                
                {/* User menu */}
                <div className="relative">
                  <Link
                    to="/settings"
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
} 