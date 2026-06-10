import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getOverview, refreshAll } from '../api';

const PLATFORM_COLORS = {
  facebook: '#1877F2', instagram: '#E1306C', tiktok: '#69C9D0', twitter: '#1DA1F2', buyrent: '#FF6B00',
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    getOverview().then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll().catch(console.error);
    await load();
    setRefreshing(false);
  };

  if (loading) return <div className="loading">Loading analytics…</div>;

  const platforms = data?.platformTotals || {};
  const properties = data?.propertyStats || [];

  const barData = Object.entries(platforms).map(([name, stats]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    reach: stats.reach || 0,
    likes: stats.likes || 0,
    impressions: stats.impressions || 0,
  }));

  const pieData = barData.filter(d => d.reach > 0).map(d => ({ name: d.name, value: d.reach }));

  const totals = properties.reduce(
    (acc, { totals: t }) => ({
      reach: acc.reach + (t.reach || 0),
      likes: acc.likes + (t.likes || 0),
      impressions: acc.impressions + (t.impressions || 0),
      comments: acc.comments + (t.comments || 0),
    }),
    { reach: 0, likes: 0, impressions: 0, comments: 0 }
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : '↻ Refresh Data'}
        </button>
      </div>

      <div className="stat-row">
        {[
          { label: 'Total Reach', value: fmt(totals.reach) },
          { label: 'Total Impressions', value: fmt(totals.impressions) },
          { label: 'Total Likes', value: fmt(totals.likes) },
          { label: 'Total Comments', value: fmt(totals.comments) },
          { label: 'Properties', value: properties.length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="section-title">Traction by Platform (Reach)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="name" stroke="#8892a4" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8892a4" tick={{ fontSize: 12 }} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2e3150', borderRadius: 8, fontSize: 13 }}
                formatter={(v, n) => [fmt(v), n]}
              />
              <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name.toLowerCase()] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Share of Reach by Platform</div>
          {pieData.length === 0 ? (
            <div className="empty"><p>No reach data yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name.toLowerCase()] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1a1d27', border: '1px solid #2e3150', borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Top Properties by Reach</div>
        {properties.length === 0 ? (
          <div className="empty"><h3>No properties yet</h3><p>Add a property to start tracking.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Address</th>
                  <th>Reach</th>
                  <th>Impressions</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(({ property, totals: t }) => (
                  <tr key={property.id}>
                    <td style={{ fontWeight: 600 }}>{property.name}</td>
                    <td style={{ color: '#8892a4' }}>{property.address}</td>
                    <td>{fmt(t.reach)}</td>
                    <td>{fmt(t.impressions)}</td>
                    <td>{fmt(t.likes)}</td>
                    <td>{fmt(t.comments)}</td>
                    <td>{fmt(t.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
