import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getPlatformAnalytics, refreshAll } from '../api';
import PlatformNav, { PLATFORMS } from './PlatformNav';

function fmt(val) {
  if (val == null) return '0';
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return String(val);
}

function fmtDate(val) {
  if (!val) return '';
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PlatformPage() {
  const { platform } = useParams();
  const cfg = PLATFORMS[platform] || { name: platform, color: '#6366f1', icon: '📊' };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPlatformAnalytics(platform);
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [platform]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAll();
      await load();
    } catch (e) {
      setError(e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <div className="loading">Loading {cfg.name} analytics...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { totals = {}, history = [], properties: propList = [] } = data;

  const chartData = history.map(h => ({
    ...h,
    date: fmtDate(h.recorded_at),
  }));

  const sortedProps = [...propList].sort((a, b) => (b.latest.reach || 0) - (a.latest.reach || 0));

  return (
    <div>
      <PlatformNav activePlatform={platform} />

      <div className="platform-header" style={{ borderColor: cfg.color }}>
        <span className="platform-header-icon">{cfg.icon}</span>
        <div>
          <h1 className="page-title" style={{ color: cfg.color, marginBottom: 4 }}>{cfg.name}</h1>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Per-property analytics with time-series tracking</span>
        </div>
        <button
          className="btn btn-ghost"
          style={{ marginLeft: 'auto' }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-row" style={{ marginTop: 24 }}>
        {[
          { label: 'Total Reach',    value: totals.reach },
          { label: 'Total Likes',    value: totals.likes },
          { label: 'Total Comments', value: totals.comments },
          { label: 'Total Shares',   value: totals.shares },
        ].map(({ label, value }) => (
          <div className="stat-card" key={label}>
            <div className="label">{label}</div>
            <div className="value">{fmt(value)}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="history-chart">
        <div className="section-title" style={{ marginBottom: 16 }}>Performance Over Time</div>
        {chartData.length === 0 ? (
          <div className="empty">
            <h3>No data yet</h3>
            <p>Add a property post link and click Refresh to start tracking.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 13 }} />
              <Area type="monotone" dataKey="reach"    name="Reach"    stroke={cfg.color}  fill="url(#colorReach)"    strokeWidth={2} />
              <Area type="monotone" dataKey="likes"    name="Likes"    stroke="#22c55e"    fill="url(#colorLikes)"    strokeWidth={2} />
              <Area type="monotone" dataKey="comments" name="Comments" stroke="#f59e0b"    fill="url(#colorComments)" strokeWidth={2} />
              <Area type="monotone" dataKey="shares"   name="Shares"   stroke="#a855f7"    fill="url(#colorShares)"   strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Property table */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-title">Performance by Property</div>
        {sortedProps.length === 0 ? (
          <div className="empty">
            <p>No properties found. Add a property to get started.</p>
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
                {sortedProps.map(({ property, latest }) => (
                  <tr key={property.id}>
                    <td style={{ fontWeight: 500 }}>{property.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{property.address}</td>
                    <td>{fmt(latest.reach)}</td>
                    <td>{fmt(latest.likes)}</td>
                    <td>{fmt(latest.comments)}</td>
                    <td>{fmt(latest.shares)}</td>
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
