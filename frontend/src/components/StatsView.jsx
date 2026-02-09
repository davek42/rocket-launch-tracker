import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChartData } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Rocket } from 'lucide-react';

const GROUP_OPTIONS = [
  { value: 'year', label: 'By Year' },
  { value: 'month', label: 'By Month' },
  { value: 'provider', label: 'By Provider' },
  { value: 'country', label: 'By Country' }
];

const BAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
  '#84cc16', '#a855f7', '#0ea5e9', '#22c55e', '#eab308',
  '#64748b'
];

export default function StatsView({ filters }) {
  const [groupBy, setGroupBy] = useState('year');

  // Strip pagination/sort fields — only pass filter criteria
  const chartFilters = {
    upcoming: filters.upcoming,
    past: filters.past,
    provider: filters.provider,
    country: filters.country,
    state: filters.state,
    location: filters.location,
    rocket: filters.rocket,
    status: filters.status,
    dateFrom: filters.dateFrom || filters.from,
    dateTo: filters.dateTo || filters.to,
    search: filters.search
  };

  const { data, isLoading } = useQuery({
    queryKey: ['chartData', chartFilters, groupBy],
    queryFn: () => fetchChartData(chartFilters, groupBy)
  });

  const rawResults = data?.data?.results || [];

  // For provider/country: show top 15, aggregate rest as "Other"
  let chartData = rawResults;
  if ((groupBy === 'provider' || groupBy === 'country') && rawResults.length > 15) {
    const top15 = rawResults.slice(0, 15);
    const otherCount = rawResults.slice(15).reduce((sum, r) => sum + r.count, 0);
    chartData = [...top15, { label: 'Other', count: otherCount }];
  }

  const dataKey = (groupBy === 'year' || groupBy === 'month') ? 'period' : 'label';
  const totalLaunches = rawResults.reduce((sum, r) => sum + r.count, 0);
  const groupCount = rawResults.length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading chart data...</span>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-20">
        <Rocket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No data available</h3>
        <p className="text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4">
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-sm text-gray-500">Total Launches</p>
            <p className="text-2xl font-bold text-gray-800">{totalLaunches.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-sm text-gray-500">Groups</p>
            <p className="text-2xl font-bold text-gray-800">{groupCount}</p>
          </div>
        </div>

        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          {GROUP_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 22)}>
          <BarChart
            data={chartData}
            layout={(groupBy === 'provider' || groupBy === 'country') ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 30, left: (groupBy === 'provider' || groupBy === 'country') ? 140 : 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {(groupBy === 'provider' || groupBy === 'country') ? (
              <>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey={dataKey}
                  width={130}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={dataKey}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  angle={groupBy === 'month' ? -45 : 0}
                  textAnchor={groupBy === 'month' ? 'end' : 'middle'}
                  height={groupBy === 'month' ? 80 : 40}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value) => [value.toLocaleString(), 'Launches']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
