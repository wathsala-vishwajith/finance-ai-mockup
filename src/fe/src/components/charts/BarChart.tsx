import React from 'react';
import { BarChartData } from '../../hooks/useChartWebSocket';

interface BarChartProps {
  data: BarChartData | null;
  width?: number;
  height?: number;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 400,
  height = 250,
  className = '',
}) => {
  if (!data || !data.bars || data.bars.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const maxValue = Math.max(...data.bars.map(bar => bar.value));
  const minValue = 0; // Start from 0 for bar charts
  const valueRange = maxValue - minValue || 1;
  
  const barWidth = chartWidth / data.bars.length * 0.8;
  const barSpacing = chartWidth / data.bars.length * 0.2;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        <defs>
          <pattern id="bar-grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-200 dark:text-gray-600"
            />
          </pattern>
        </defs>
        
        <rect 
          x={margin.left} 
          y={margin.top} 
          width={chartWidth} 
          height={chartHeight} 
          fill="url(#bar-grid)" 
        />
        
        {/* Y-axis */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-500"
        />
        
        {/* X-axis */}
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-500"
        />
        
        {/* Bars */}
        {data.bars.map((bar, index) => {
          const barHeight = (bar.value / valueRange) * chartHeight;
          const x = margin.left + (index * chartWidth / data.bars.length) + (barSpacing / 2);
          const y = height - margin.bottom - barHeight;
          
          return (
            <g key={index}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={bar.color || `hsl(${index * 360 / data.bars.length}, 70%, 60%)`}
                className="hover:opacity-80 cursor-pointer"
                rx="4"
                ry="4"
              >
                <title>{`${bar.label}: ${bar.value.toFixed(2)}`}</title>
              </rect>
              
              {/* Value label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs font-medium fill-current text-gray-700 dark:text-gray-300"
              >
                {bar.value.toFixed(1)}
              </text>
              
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={height - margin.bottom + 15}
                textAnchor="middle"
                className="text-xs fill-current text-gray-600 dark:text-gray-400"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = minValue + ratio * valueRange;
          const y = height - margin.bottom - (ratio * chartHeight);
          
          return (
            <g key={ratio}>
              {/* Grid line */}
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-300 dark:text-gray-600"
              />
              {/* Label */}
              <text
                x={margin.left - 10}
                y={y + 3}
                textAnchor="end"
                className="text-xs fill-current text-gray-600 dark:text-gray-400"
              >
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Last updated time */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}; 