import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getPlatformAnalytics, refreshAll } from '../api';
import PlatformNav from './PlatformNav';

const PLATFORMS = {
  facebook:  { name: 'Facebook',  color: '#1877F2', icon: '📘' },
  instagram: { name: 'Instagram', color: '#E1306C', icon: '📸' },
  tiktok:    { name: 'TikTok',    color: '#69C9D0', icon: '🎵' },
  twitter:   { name: 'Twitter/X', color: '#1DA1F2', icon: '🐦' },
  buyrent:   { name: 'Buyrent',   color: '#FF6B00', icon: '🏠' },
};

const CHART_COLORS = {
  reach:    '#6366f1',
  likes:    '#22c55e',
  comments: '#f59e0b',
  shares:   '#ec4899',
};

function fmt(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return String(val);
}

function fmtDate(val) {
  if (!val) return '';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PlatformPage() {
  const { platform } = useParams();
  const cfg = PLATFORMS[platform] || { name: platform, color: '#6366f1', icon: '📊' };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPlatformAnalytics(platform);
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      await refreshAll();
      setRefreshMsg('Data refreshed successfully.');
      await load();
    } catch (e) {
      setRefreshMsg('Refresh failed: ' + (e?.response?.data?.error || e.message));
    } finally {
      setRefreshing(false);
    }
  }

  const totals = data?.totals || {};
  const history = data?.history || [];
  const properties = data?.properties || [];

  const chartData = history.map(h => ({
    ...h,
    label: fmtDate(h.recorded_at),
  }));

  const sortedProperties = [...properties].sort(
    (a, b) => (b.latest?.reach || 0) - (a.latest?.reach || 0)
  );

  return (
    <div>
      <PlatformNav activePlatform={platform} />

      <div className="platform-header" style={{ borderColor: cfg.color }}>
        <span className="platform-header-icon">{cfg.icon}</span>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>{cfg.name} Analytics</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Time-series performance across all properties
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {refreshMsg && (
        <div className={`alert ${refreshMsg.startsWith('Refresh failed') ? 'alert-error' : 'alert-success'}`}>
          {refreshMsg}
        </div>
      )}

      {loading && <div className="loading">Loading {cfg.name} analytics...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* Stat cards */}
          <div className="stat-row">
            <div className="stat-card">
              <div className="label">Total Reach</div>
              <div className="value" style={{ color: CHART_COLORS.reach }}>{fmt(totals.reach || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Likes</div>
              <div className="value" style={{ color: CHART_COLORS.likes }}>{fmt(totals.likes || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Comments</div>
              <div className="value" style={{ color: CHART_COLORS.comments }}>{fmt(totals.comments || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Shares</div>
              <div className="value" style={{ color: CHART_COLORS.shares }}>{fmt(totals.shares || 0)}</div>
            </div>
          </div>

          {/* History chart */}
          <div className="history-chart card" style={{ marginBottom: 28 }}>
            <div className="section-title">Performance Over Time</div>
            {chartData.length === 0 ? (
              <div className="empty">
                <h3>No data yet</h3>
                <p>Add a property post link and click Refresh to start tracking.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmt}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, color: 'var(--muted)' }} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key.charAt(0).toUpperCase() + key.slice(1)}
                      stroke={color}
                      fill={`url(#grad-${key})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Properties table */}
          <div className="card">
            <div className="section-title">Performance by Property</div>
            {sortedProperties.length === 0 ? (
              <div className="empty">
                <h3>No properties found</h3>
                <p>Add a property and connect a {cfg.name} post to see data here.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Property Name</th>
                      <th>Address</th>
                      <th>Reach</th>
                      <th>Likes</th>
                      <th>Comments</th>
                      <th>Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProperties.map(({ property, latest }) => (
                      <tr key={property.id}>
                        <td style={{ fontWeight: 600 }}>{property.name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{property.address}</td>
                        <td style={{ color: CHART_COLORS.reach }}>{fmt(latest?.reach || 0)}</td>
                        <td style={{ color: CHART_COLORS.likes }}>{fmt(latest?.likes || 0)}</td>
                        <td style={{ color: CHART_COLORS.comments }}>{fmt(latest?.comments || 0)}</td>
                        <td style={{ color: CHART_COLORS.shares }}>{fmt(latest?.shares || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
