import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  tiktok: '#69C9D0',
  twitter: '#1DA1F2',
  buyrent: '#FF6B00',
};

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0));

export default function PlatformBreakdown({ platformTotals }) {
  const pieData = Object.entries(platformTotals || {})
    .map(([platform, stats]) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      value: stats.reach || 0,
      platform,
    }))
    .filter((d) => d.value > 0);

  if (pieData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 220,
          color: 'var(--muted)',
          fontSize: 13,
        }}
      >
        No reach data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {pieData.map((entry) => (
            <Cell
              key={entry.platform}
              fill={PLATFORM_COLORS[entry.platform] || '#6366f1'}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => fmt(v)}
          contentStyle={{
            background: '#1a1d27',
            border: '1px solid #2e3150',
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
