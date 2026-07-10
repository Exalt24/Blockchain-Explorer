import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getEventDistribution, getTimeline } from '../services/api';
import type { EventDistribution, TimelineData } from '../types';

interface ChartsProps {
  hours?: number;
}

export default function Charts({ hours = 24 }: ChartsProps) {
  const [distribution, setDistribution] = useState<EventDistribution[]>([]);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChartData();
  }, [hours]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [distData, timeData] = await Promise.all([
        getEventDistribution(),
        getTimeline(hours),
      ]);
      setDistribution(Array.isArray(distData) ? distData : []);
      setTimeline(Array.isArray(timeData) ? timeData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setDistribution([]);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899'];

  const formatTime = (hour: any) => {
    const date = new Date(hour);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const pieChartData = distribution.map(d => ({
    name: d.event_name,
    value: d.count,
    percentage: d.percentage
  }));

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-4"></div>
          <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <p className="text-red-400">❌ {error}</p>
        <button
          onClick={loadChartData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasDistributionData = distribution.length > 0;
  const hasTimelineData = timeline.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Event Distribution Pie Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold mb-4 text-gray-100">📊 Event Distribution</h3>
        {hasDistributionData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.name} (${props.percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6',
                }}
                formatter={(value: any, name: any, props: any) => [
                  `${value} events (${props.payload.percentage.toFixed(1)}%)`,
                  name,
                ]}
              />
              <Legend
                wrapperStyle={{ color: '#f3f4f6' }}
                formatter={(value) => <span className="text-gray-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No event data available</p>
          </div>
        )}
      </div>

      {/* Activity Timeline Line Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold mb-4 text-gray-100">📈 Activity Timeline ({hours}h)</h3>
        {hasTimelineData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="hour"
                tickFormatter={formatTime}
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6',
                }}
                labelFormatter={formatTime}
                formatter={(value: any) => [`${value} events`, 'Count']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No timeline data available</p>
          </div>
        )}
      </div>
    </div>
  );
}