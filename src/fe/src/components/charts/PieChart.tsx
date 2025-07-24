import React from 'react';
import { PieChartData } from '../../hooks/useChartWebSocket';

interface PieChartProps {
  data: PieChartData | null;
  width?: number;
  height?: number;
  className?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  width = 300,
  height = 300,
  className = '',
}) => {
  if (!data || !data.slices || data.slices.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const radius = Math.min(width, height) / 2 - 40;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);
  
  // Calculate angles for each slice
  let currentAngle = -90; // Start from top
  const slicesWithAngles = data.slices.map((slice) => {
    const percentage = slice.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    currentAngle += angle;
    
    return {
      ...slice,
      percentage,
      startAngle,
      endAngle,
      angle,
    };
  });

  // Generate SVG path for pie slice
  const createPieSlicePath = (startAngle: number, endAngle: number, radius: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row items-center gap-4">
        {/* Pie Chart SVG */}
        <svg width={width} height={height} className="flex-shrink-0">
          {slicesWithAngles.map((slice, index) => (
            <g key={index}>
              <path
                d={createPieSlicePath(slice.startAngle, slice.endAngle, radius)}
                fill={slice.color || `hsl(${index * 360 / data.slices.length}, 70%, 60%)`}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 cursor-pointer"
              >
                <title>{`${slice.label}: ${slice.value.toFixed(2)} (${(slice.percentage * 100).toFixed(1)}%)`}</title>
              </path>
              
              {/* Label text */}
              {slice.percentage > 0.05 && ( // Only show label if slice is > 5%
                <text
                  x={centerX + (radius * 0.7) * Math.cos(((slice.startAngle + slice.endAngle) / 2) * Math.PI / 180)}
                  y={centerY + (radius * 0.7) * Math.sin(((slice.startAngle + slice.endAngle) / 2) * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-white"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {(slice.percentage * 100).toFixed(0)}%
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Legend</h4>
          <div className="space-y-2">
            {slicesWithAngles.map((slice, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: slice.color || `hsl(${index * 360 / data.slices.length}, 70%, 60%)` }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {slice.label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">
                  {slice.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Last updated time */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}; 