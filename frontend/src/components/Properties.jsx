import React, { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { getProperties, deleteProperty, getPropertyAnalytics, deleteLink, addLink, saveManualPlatformStats } from '../api';

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://www.facebook.com/yourpage/posts/123' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/p/ABC123/' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://www.tiktok.com/@user/video/123' },
  { key: 'twitter',   label: 'Twitter/X', placeholder: 'https://twitter.com/user/status/123' },
  { key: 'buyrent',   label: 'Buyrent',   placeholder: 'https://www.buyrent.co.za/listing/123' },
];

function PropertyModal({ property, onClose, onDeleted }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newLinks, setNewLinks] = useState({ facebook: '', instagram: '', tiktok: '', twitter: '', buyrent: '' });
  const [addingLinks, setAddingLinks] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [showAddLinks, setShowAddLinks] = useState(false);
  const [showManualStats, setShowManualStats] = useState(false);
  const [manualPlatform, setManualPlatform] = useState('facebook');
  const [manualFields, setManualFields] = useState({ reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });
  const [savingManual, setSavingManual] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  const reload = () => {
    setLoading(true);
    getPropertyAnalytics(property.id).then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [property.id]);

  const handleDeleteLink = async (linkId) => {
    await deleteLink(property.id, linkId);
    reload();
  };

  const handleAddLinks = async () => {
    const toAdd = PLATFORMS.filter(({ key }) => newLinks[key].trim());
    if (toAdd.length === 0) { setLinkError('Enter at least one URL.'); return; }
    setAddingLinks(true);
    setLinkError('');
    try {
      for (const { key } of toAdd) {
        await addLink(property.id, { platform: key, post_url: newLinks[key].trim() });
      }
      setNewLinks({ facebook: '', instagram: '', tiktok: '', twitter: '', buyrent: '' });
      setShowAddLinks(false);
      reload();
    } catch (err) {
      setLinkError(err.response?.data?.error || err.message || 'Failed to add links.');
    } finally {
      setAddingLinks(false);
    }
  };

  const handleSaveManualStats = async () => {
    setSavingManual(true);
    try {
      await saveManualPlatformStats(property.id, { platform: manualPlatform, ...manualFields });
      setManualSuccess(true);
      reload();
      setTimeout(() => setManualSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingManual(false);
    }
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>Linked Posts</div>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowAddLinks(v => !v)}>
                {showAddLinks ? 'Cancel' : '+ Add Links'}
              </button>
            </div>

            {showAddLinks && (
              <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                {PLATFORMS.map(({ key, label, placeholder }) => (
                  <div className="form-group" key={key} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                      <span className={`platform-badge ${key}`} style={{ marginRight: 6 }}>{label}</span>
                    </label>
                    <input
                      value={newLinks[key]}
                      onChange={e => setNewLinks(l => ({ ...l, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
                {linkError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{linkError}</div>}
                <button className="btn btn-primary" onClick={handleAddLinks} disabled={addingLinks}>
                  {addingLinks ? 'Saving…' : 'Save Links'}
                </button>
              </div>
            )}

            {property.links?.length > 0 ? (
              property.links.map(link => (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className={`platform-badge ${link.platform}`}>{link.platform}</span>
                  <a href={link.post_url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.post_url || link.post_id}</a>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteLink(link.id)}>Remove</button>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>No platforms linked yet. Click "+ Add Links" above.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>Enter Stats Manually</div>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowManualStats(v => !v)}>
                {showManualStats ? 'Hide' : 'Show'}
              </button>
            </div>

            {showManualStats && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Platform</label>
                  <select
                    value={manualPlatform}
                    onChange={e => setManualPlatform(e.target.value)}
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'inherit', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
                  >
                    {PLATFORMS.map(({ key, label }) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {['reach', 'impressions', 'likes', 'comments', 'shares', 'clicks'].map(field => (
                    <div className="form-group" key={field}>
                      <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)', textTransform: 'capitalize' }}>{field}</label>
                      <input
                        type="number"
                        min="0"
                        value={manualFields[field]}
                        onChange={e => setManualFields(f => ({ ...f, [field]: parseInt(e.target.value, 10) || 0 }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-primary" onClick={handleSaveManualStats} disabled={savingManual}>
                    {savingManual ? 'Saving…' : 'Save Stats'}
                  </button>
                  {manualSuccess && <span style={{ color: 'var(--accent)', fontSize: 13 }}>Stats saved!</span>}
                </div>
              </div>
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
