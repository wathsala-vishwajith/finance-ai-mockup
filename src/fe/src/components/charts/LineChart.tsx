import React from 'react';
import { LineChartData } from '../../hooks/useChartWebSocket';

interface LineChartProps {
  data: LineChartData | null;
  width?: number;
  height?: number;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 200,
  className = '',
}) => {
  if (!data || !data.data_points || data.data_points.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const margin = 30;
  const chartWidth = width - 2 * margin;
  const chartHeight = height - 2 * margin;
  
  const maxValue = Math.max(...data.data_points);
  const minValue = Math.min(...data.data_points);
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path
  const points = data.data_points.map((value, index) => {
    const x = margin + (index / (data.data_points.length - 1)) * chartWidth;
    const y = margin + ((maxValue - value) / valueRange) * chartHeight;
    return { x, y, value };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-200 dark:text-gray-600"
            />
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Axes */}
        <line
          x1={margin}
          y1={margin}
          x2={margin}
          y2={height - margin}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-500"
        />
        <line
          x1={margin}
          y1={height - margin}
          x2={width - margin}
          y2={height - margin}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-500"
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3B82F6"
              stroke="white"
              strokeWidth="2"
            />
            {/* Tooltip on hover */}
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              className="hover:fill-blue-500 hover:fill-opacity-10 cursor-pointer"
            >
              <title>{`Value: ${point.value.toFixed(2)}`}</title>
            </circle>
          </g>
        ))}
        
        {/* Y-axis labels */}
        <text
          x={margin - 10}
          y={margin + 5}
          textAnchor="end"
          className="text-xs fill-current text-gray-600 dark:text-gray-400"
        >
          {maxValue.toFixed(1)}
        </text>
        <text
          x={margin - 10}
          y={height - margin + 5}
          textAnchor="end"
          className="text-xs fill-current text-gray-600 dark:text-gray-400"
        >
          {minValue.toFixed(1)}
        </text>
      </svg>
      
      {/* Last updated time */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}; 