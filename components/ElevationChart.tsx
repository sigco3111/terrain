import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ElevationResult } from '../types';
import { HoverData } from '../App';
import { calculateDistance } from '../utils/stats';

interface ElevationChartProps {
  data: ElevationResult[];
  hoveredData: HoverData | null;
  onHover: (data: HoverData | null) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
        <p className="label text-sm text-gray-300">{`거리: ${payload[0].payload.distance.toFixed(2)} km`}</p>
        <p className="intro text-sm text-cyan-400">{`고도: ${payload[0].value.toFixed(1)} m`}</p>
      </div>
    );
  }
  return null;
};

const ElevationChart: React.FC<ElevationChartProps> = ({ data, hoveredData, onHover }) => {
  const chartData = useMemo(() => {
    let cumulativeDistance = 0;
    return data.map((point, index) => {
        if (index > 0) {
            cumulativeDistance += calculateDistance(data[index - 1].location, point.location);
        }
        return {
            distance: cumulativeDistance,
            elevation: point.elevation,
            location: point.location,
        };
    });
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        onMouseMove={(e: any) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
                const payload = e.activePayload[0].payload;
                onHover(payload as HoverData);
            }
        }}
        onMouseLeave={() => onHover(null)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
        <XAxis 
          dataKey="distance" 
          stroke="#A0AEC0" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value) => `${value.toFixed(1)}km`}
        />
        <YAxis stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} unit="m" />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Line type="monotone" dataKey="elevation" name="고도" stroke="#38BDF8" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#0EA5E9' }} />
        {hoveredData && (
            <ReferenceLine x={hoveredData.distance} stroke="#FBBF24" strokeWidth={1.5} ifOverflow="extendDomain" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ElevationChart;