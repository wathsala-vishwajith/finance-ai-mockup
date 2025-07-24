import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ChartConfig {
  id: string;
  name: string;
  type: 'line' | 'pie' | 'bar';
  intervalMs: number;
}

interface CreateChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChart: (config: Omit<ChartConfig, 'id'>) => void;
}

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', description: 'Show trends over time' },
  { value: 'pie', label: 'Pie Chart', description: 'Show proportional data' },
  { value: 'bar', label: 'Bar Chart', description: 'Compare categories' },
] as const;

const INTERVAL_OPTIONS = [
  { value: 500, label: '0.5 seconds' },
  { value: 1000, label: '1 second' },
  { value: 2000, label: '2 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 30000, label: '30 seconds' },
];

export const CreateChartDialog: React.FC<CreateChartDialogProps> = ({
  isOpen,
  onClose,
  onCreateChart,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'line' as 'line' | 'pie' | 'bar',
    intervalMs: 2000,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Chart name is required';
    }
    
    if (formData.name.trim().length > 50) {
      newErrors.name = 'Chart name must be 50 characters or less';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onCreateChart({
        name: formData.name.trim(),
        type: formData.type,
        intervalMs: formData.intervalMs,
      });
      
      // Reset form
      setFormData({
        name: '',
        type: 'line',
        intervalMs: 2000,
      });
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-6 py-6 shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create New Chart
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chart Name */}
            <div>
              <label htmlFor="chart-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chart Name
              </label>
              <input
                type="text"
                id="chart-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter chart name..."
                maxLength={50}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Chart Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Chart Type
              </label>
              <div className="space-y-3">
                {CHART_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-start cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="chart-type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Refresh Interval */}
            <div>
              <label htmlFor="refresh-interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refresh Interval
              </label>
              <select
                id="refresh-interval"
                value={formData.intervalMs}
                onChange={(e) => handleInputChange('intervalMs', parseInt(e.target.value))}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Chart
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 