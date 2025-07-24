import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { 
  UserIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

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

interface ProfileFormData {
  full_name: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface DeleteAccountFormData {
  password: string;
  confirmation: string;
}

export default function SettingsPage() {
  const { accessToken, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile form
  const profileForm = useForm<ProfileFormData>();
  const passwordForm = useForm<PasswordFormData>();
  const deleteForm = useForm<DeleteAccountFormData>();

  // Fetch user profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<UserProfile> => {
      const res = await api.get("/auth/me");
      return res.data;
    },
    enabled: !!accessToken,
  });

  // Reset form when profile data loads
  React.useEffect(() => {
    if (profileData) {
      profileForm.reset({
        full_name: profileData.user.full_name || '',
      });
    }
  }, [profileData, profileForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await api.put("/auth/profile", data);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully!');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || 'Failed to update profile');
      setSuccessMessage('');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await api.put("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Password changed successfully!');
      setErrorMessage('');
      passwordForm.reset();
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || 'Failed to change password');
      setSuccessMessage('');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (data: DeleteAccountFormData) => {
      const response = await api.delete("/auth/account", { data });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Account deleted successfully. You will be logged out.');
      setTimeout(() => {
        logout();
      }, 2000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || 'Failed to delete account');
      setSuccessMessage('');
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      setErrorMessage('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate(data);
  };

  const onDeleteSubmit = (data: DeleteAccountFormData) => {
    deleteAccountMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const user = profileData?.user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-200">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', name: 'Profile', icon: UserIcon },
            { id: 'password', name: 'Password', icon: KeyIcon },
            { id: 'account', name: 'Account', icon: ExclamationTriangleIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Update your personal information and email address.
              </p>
            </div>

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Username cannot be changed</p>
              </div>

                             <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   Email Address
                 </label>
                 <input
                   type="email"
                   value={user?.email || ''}
                   disabled
                   className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                 />
                 <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email address cannot be changed for security reasons</p>
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  {...profileForm.register('full_name')}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><span className="font-medium">Member since:</span> {user && new Date(user.created_at).toLocaleDateString()}</p>
                <p><span className="font-medium">Account status:</span> {user?.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Update your password to keep your account secure.
              </p>
            </div>

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('current_password', { required: 'Current password is required' })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('new_password', { 
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must contain uppercase, lowercase, number, and special character (@$!%*?&)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register('confirm_password', { required: 'Please confirm your new password' })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Permanently delete your account and all associated data.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Delete Account
                  </h4>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    This action cannot be undone. All your data, including messages and settings, will be permanently deleted.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-200 bg-white dark:bg-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <form onSubmit={deleteForm.handleSubmit(onDeleteSubmit)} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Enter your password to confirm
                          </label>
                          <input
                            type="password"
                            {...deleteForm.register('password', { required: 'Password is required' })}
                            className="w-full rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-red-900/30 px-3 py-2 text-sm text-red-900 dark:text-red-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Type "DELETE" to confirm
                          </label>
                          <input
                            type="text"
                            {...deleteForm.register('confirmation', { required: 'Please type DELETE to confirm' })}
                            className="w-full rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-red-900/30 px-3 py-2 text-sm text-red-900 dark:text-red-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            type="submit"
                            disabled={deleteAccountMutation.isPending}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              deleteForm.reset();
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 