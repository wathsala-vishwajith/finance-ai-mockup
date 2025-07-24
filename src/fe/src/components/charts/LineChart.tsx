import React, { useMemo, useRef, useEffect } from 'react';
import { AccumulatedLineData } from '../../hooks/useChartWebSocket';

interface LineChartProps {
  data: AccumulatedLineData | null;
  width?: number;
  height?: number;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 500,
  height = 300,
  className = '',
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<SVGSVGElement>(null);

  const margin = 40;
  const chartWidth = width - 2 * margin;
  const chartHeight = height - 2 * margin;

  // Consolidate all calculations into a single useMemo to avoid hooks order issues
  const chartCalculations = useMemo(() => {
    // Default empty state
    const emptyState = {
      xScale: null,
      yScale: null,
      pathData: '',
      points: [],
      latestPoint: null,
      yMin: 0,
      yMax: 100,
      hasData: false
    };

    if (!data || !data.data || data.data.length === 0) {
      return emptyState;
    }

    const xValues = data.data.map(d => d.x);
    const yValues = data.data.map(d => d.value);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMinVal = Math.min(...yValues);
    const yMaxVal = Math.max(...yValues);
    
    // Add some padding to y-axis
    const yPadding = (yMaxVal - yMinVal) * 0.1 || 5;
    const yMinPadded = yMinVal - yPadding;
    const yMaxPadded = yMaxVal + yPadding;
    
    // Create scale functions
    const xRange = xMax - xMin || 1;
    const yRange = yMaxPadded - yMinPadded;
    
    const xScale = (x: number) => margin + ((x - xMin) / xRange) * chartWidth;
    const yScale = (y: number) => margin + ((yMaxPadded - y) / yRange) * chartHeight;
    
    // Generate points for rendering
    const points = data.data.map(d => ({
      x: xScale(d.x),
      y: yScale(d.value),
      value: d.value,
      timestamp: d.timestamp,
      index: d.x
    }));
    
    // Generate smooth SVG path using cubic bezier curves
    let pathData = '';
    if (points.length > 0) {
      pathData = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        if (points.length === 2) {
          // For just two points, use straight line
          pathData += ` L ${curr.x} ${curr.y}`;
        } else {
          // Use smooth curves for multiple points
          const cp1x = prev.x + (curr.x - prev.x) * 0.5;
          const cp1y = prev.y;
          const cp2x = curr.x - (curr.x - prev.x) * 0.5;
          const cp2y = curr.y;
          
          pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }
      }
    }
    
    const latestPoint = points.length > 0 ? points[points.length - 1] : null;
    
    return {
      xScale,
      yScale,
      pathData,
      points,
      latestPoint,
      yMin: yMinPadded,
      yMax: yMaxPadded,
      hasData: true
    };
  }, [data, chartWidth, chartHeight, margin]);

  // Animate path drawing when new points are added
  useEffect(() => {
    if (pathRef.current && chartCalculations.pathData) {
      const path = pathRef.current;
      const length = path.getTotalLength();
      
      // Set up the starting positions
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;
      
      // Trigger the drawing animation
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
        path.style.strokeDashoffset = '0';
      });
    }
  }, [chartCalculations.pathData]);

  if (!chartCalculations.hasData) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500 dark:text-gray-400">Waiting for data...</p>
      </div>
    );
  }

  const { points, latestPoint, pathData, yMin, yMax } = chartCalculations;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Real-time Time Series Chart
        </h3>
        {latestPoint && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Latest: {latestPoint.value.toFixed(2)} 
            <span className="ml-2">Duration: {data?.data.length || 0} intervals</span>
          </p>
        )}
      </div>
      
      <svg 
        ref={containerRef}
        width={width} 
        height={height} 
        className="overflow-visible"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-200 dark:text-gray-600 opacity-50"
            />
          </pattern>
          
          {/* Gradient for line */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="1" />
          </linearGradient>
          
          {/* Glow effect for latest point */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Chart area border */}
        <rect
          x={margin}
          y={margin}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-gray-600"
        />
        
        {/* Y-axis grid lines and labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = margin + ratio * chartHeight;
          const value = yMax - ratio * (yMax - yMin);
          return (
            <g key={index}>
              <line
                x1={margin}
                y1={y}
                x2={margin + chartWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-200 dark:text-gray-600"
              />
              <text
                x={margin - 8}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-current text-gray-600 dark:text-gray-400"
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis grid lines and labels (time-based) */}
        {points.length > 1 && (() => {
          const xValues = data.data.map(d => d.x);
          const xMin = Math.min(...xValues);
          const xMax = Math.max(...xValues);
          const xRange = xMax - xMin || 1;
          
          // Calculate approximate interval from data progression
          let intervalSeconds = 2; // Default fallback
          if (data.data.length > 1) {
            // Estimate interval from timestamps if available
            const timestamps = data.data.map(d => new Date(d.timestamp).getTime());
            const avgInterval = timestamps.length > 1 
              ? (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1) / 1000
              : 2;
            intervalSeconds = Math.max(0.5, avgInterval); // Ensure reasonable minimum
          }
          
          // Show 5 time labels across the chart
          return [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const x = margin + ratio * chartWidth;
            const timeIndex = xMin + ratio * xRange;
            const timeInSeconds = timeIndex * intervalSeconds;
            
            return (
              <g key={`x-${index}`}>
                <line
                  x1={x}
                  y1={margin}
                  x2={x}
                  y2={margin + chartHeight}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-gray-200 dark:text-gray-600"
                />
                <text
                  x={x}
                  y={margin + chartHeight + 15}
                  textAnchor="middle"
                  className="text-xs fill-current text-gray-600 dark:text-gray-400"
                >
                  {timeInSeconds < 60 
                    ? `${timeInSeconds.toFixed(0)}s`
                    : `${(timeInSeconds / 60).toFixed(1)}m`
                  }
                </text>
              </g>
            );
          });
        })()}
        
        {/* Main line path */}
        {pathData && (
          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
        )}
        
        {/* Data points with smooth transitions */}
        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          const isRecent = index >= points.length - 3;
          
          return (
            <g key={`${point.index}-${index}`}>
              {/* Point circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isLatest ? "6" : isRecent ? "4" : "3"}
                fill={isLatest ? "#1D4ED8" : "#3B82F6"}
                stroke="white"
                strokeWidth="2"
                className={`transition-all duration-500 ${isLatest ? 'animate-pulse' : ''}`}
                filter={isLatest ? "url(#glow)" : undefined}
                style={{
                  opacity: Math.max(0.4, 1 - (points.length - index - 1) * 0.1),
                  transform: isLatest ? 'scale(1.2)' : 'scale(1)',
                  transformOrigin: `${point.x}px ${point.y}px`,
                }}
              >
                <animate
                  attributeName="r"
                  values={isLatest ? "4;8;4" : `${isRecent ? 4 : 3}`}
                  dur={isLatest ? "2s" : "0s"}
                  repeatCount={isLatest ? "indefinite" : "0"}
                />
              </circle>
              
              {/* Hover tooltip area */}
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                className="hover:fill-blue-500 hover:fill-opacity-10 cursor-pointer"
              >
                <title>
                  {`Value: ${point.value.toFixed(2)}\nTime: ${new Date(point.timestamp).toLocaleTimeString()}`}
                </title>
              </circle>
            </g>
          );
        })}
        
        {/* Value display for latest point */}
        {latestPoint && (
          <text
            x={latestPoint.x}
            y={latestPoint.y - 15}
            textAnchor="middle"
            className="text-xs font-medium fill-current text-blue-600 dark:text-blue-400"
          >
            {latestPoint.value.toFixed(1)}
          </text>
        )}
        
        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-xs font-medium fill-current text-gray-600 dark:text-gray-400"
        >
          Time (seconds)
        </text>
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className="text-xs font-medium fill-current text-gray-600 dark:text-gray-400"
        >
          Value
        </text>
      </svg>
      
      {/* Status footer */}
      {data?.latestPoint && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <span>
            Last updated: {new Date(data.latestPoint.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-green-600 dark:text-green-400">
            ● Live
          </span>
        </div>
      )}
    </div>
  );
}; 