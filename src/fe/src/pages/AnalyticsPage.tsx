import React, { useState } from 'react';
import { PlusIcon, TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { CreateChartDialog, ChartConfig } from '../components/CreateChartDialog';
import { LineChart } from '../components/charts/LineChart';
import { PieChart } from '../components/charts/PieChart';
import { BarChart } from '../components/charts/BarChart';
import { useChartWebSocket, LineChartData, PieChartData, BarChartData } from '../hooks/useChartWebSocket';

interface Chart extends ChartConfig {
  id: string;
  isActive: boolean;
}

const ChartWrapper: React.FC<{
  chart: Chart;
  token: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onIntervalChange: (id: string, intervalMs: number) => void;
}> = ({ chart, token, onToggle, onDelete, onIntervalChange }) => {
  const { data, isConnected, isConnecting, error, setInterval } = useChartWebSocket({
    chartType: chart.type,
    token,
    intervalMs: chart.intervalMs,
    enabled: chart.isActive,
  });

  const handleIntervalChange = (newInterval: number) => {
    setInterval(newInterval);
    onIntervalChange(chart.id, newInterval);
  };

  const renderChart = () => {
    switch (chart.type) {
      case 'line':
        return <LineChart data={data as LineChartData} width={500} height={300} />;
      case 'pie':
        return <PieChart data={data as PieChartData} width={400} height={400} />;
      case 'bar':
        return <BarChart data={data as BarChartData} width={500} height={300} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {chart.name}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {chart.type}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnecting ? 'bg-yellow-500' : 
              isConnected ? 'bg-green-500' : 
              'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Interval Control */}
          <select
            value={chart.intervalMs}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          
          {/* Toggle Active */}
          <button
            onClick={() => onToggle(chart.id)}
            className={`p-2 rounded-md ${
              chart.isActive
                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={chart.isActive ? 'Pause chart' : 'Start chart'}
          >
            {chart.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </button>
          
          {/* Delete Chart */}
          <button
            onClick={() => onDelete(chart.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            title="Delete chart"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {/* Chart Content */}
      <div className="flex justify-center">
        {chart.isActive ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Chart paused</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Mock token - in real app, get from auth context
  const token = localStorage.getItem('access_token') || '';

  const handleCreateChart = (config: Omit<ChartConfig, 'id'>) => {
    const newChart: Chart = {
      ...config,
      id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
    };
    
    setCharts(prev => [...prev, newChart]);
  };

  const handleToggleChart = (id: string) => {
    setCharts(prev => prev.map(chart => 
      chart.id === id ? { ...chart, isActive: !chart.isActive } : chart
    ));
  };

  const handleDeleteChart = (id: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== id));
  };

  const handleIntervalChange = (id: string, intervalMs: number) => {
    setCharts(prev => prev.map(chart => 
      chart.id === id ? { ...chart, intervalMs } : chart
    ));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage real-time charts for your data visualization needs
          </p>
        </div>
        
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Chart
        </button>
      </div>

      {/* Charts Grid */}
      {charts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No charts created</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Get started by creating your first real-time chart
          </p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Your First Chart
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart) => (
            <ChartWrapper
              key={chart.id}
              chart={chart}
              token={token}
              onToggle={handleToggleChart}
              onDelete={handleDeleteChart}
              onIntervalChange={handleIntervalChange}
            />
          ))}
        </div>
      )}

      {/* Create Chart Dialog */}
      <CreateChartDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreateChart={handleCreateChart}
      />
    </div>
  );
};

export default AnalyticsPage; 