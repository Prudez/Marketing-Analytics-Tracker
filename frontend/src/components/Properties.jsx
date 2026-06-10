import React, { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { getProperties, deleteProperty, getPropertyAnalytics, deleteLink } from '../api';

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

const PLATFORM_COLORS = {
  facebook: '#1877F2', instagram: '#E1306C', tiktok: '#69C9D0', twitter: '#1DA1F2', buyrent: '#FF6B00',
};

function PropertyModal({ property, onClose, onDeleted }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPropertyAnalytics(property.id).then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  }, [property.id]);

  const handleDeleteLink = async (linkId) => {
    await deleteLink(property.id, linkId);
    const updated = await getPropertyAnalytics(property.id);
    setAnalytics(updated);
  };

  const radarData = analytics
    ? Object.entries(analytics.byPlatform).map(([platform, result]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        reach: result.data?.reach || 0,
        likes: result.data?.likes || 0,
        impressions: result.data?.impressions || 0,
      }))
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="modal-title">{property.name}</div>
            <div className="modal-sub">{property.address}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {loading ? <div className="loading">Loading analytics…</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {['reach','impressions','likes','comments','shares','clicks'].map(k => (
                <div className="stat-card" key={k}>
                  <div className="label">{k}</div>
                  <div className="value" style={{ fontSize: 20 }}>{fmt(analytics.totals[k])}</div>
                </div>
              ))}
            </div>

            <div className="section-title">Platform Breakdown</div>
            <div style={{ marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2e3150" />
                  <PolarAngleAxis dataKey="platform" tick={{ fill: '#8892a4', fontSize: 12 }} />
                  <Radar name="Reach" dataKey="reach" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2e3150', borderRadius: 8, fontSize: 13 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="section-title">Per-Platform Stats</div>
            <div className="table-wrap" style={{ marginBottom: 20 }}>
              <table>
                <thead><tr><th>Platform</th><th>Reach</th><th>Likes</th><th>Comments</th><th>Status</th></tr></thead>
                <tbody>
                  {Object.entries(analytics.byPlatform).map(([platform, result]) => (
                    <tr key={platform}>
                      <td><span className={`platform-badge ${platform}`}>{platform}</span></td>
                      <td>{fmt(result.data?.reach)}</td>
                      <td>{fmt(result.data?.likes)}</td>
                      <td>{fmt(result.data?.comments)}</td>
                      <td>
                        {result.error ? <span style={{ color: '#ef4444', fontSize: 12 }}>Error</span> : '✓'}
                        {result.stale && <span className="stale-badge">stale</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {property.links?.length > 0 && (
              <>
                <div className="section-title">Linked Posts</div>
                {property.links.map(link => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className={`platform-badge ${link.platform}`}>{link.platform}</span>
                    <a href={link.post_url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.post_url || link.post_id}</a>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteLink(link.id)}>Remove</button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    getProperties().then(setProperties).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this property and all its data?')) return;
    await deleteProperty(id);
    load();
  };

  if (loading) return <div className="loading">Loading properties…</div>;

  return (
    <div>
      <h1 className="page-title">Properties</h1>
      {properties.length === 0 ? (
        <div className="empty"><h3>No properties yet</h3><p>Go to Add Property to get started.</p></div>
      ) : (
        <div className="property-grid">
          {properties.map(p => (
            <div key={p.id} className="property-card" onClick={() => setSelected(p)}>
              <div className="prop-name">{p.name}</div>
              <div className="prop-addr">{p.address}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {(p.links || []).map(l => (
                  <span key={l.id} className={`platform-badge ${l.platform}`}>{l.platform}</span>
                ))}
                {(p.links || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No platforms linked</span>}
              </div>
              <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 12px' }} onClick={(e) => handleDelete(e, p.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <PropertyModal
          property={selected}
          onClose={() => { setSelected(null); load(); }}
          onDeleted={load}
        />
      )}
    </div>
  );
}
