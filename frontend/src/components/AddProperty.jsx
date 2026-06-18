import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProperty, addLink, saveBuyrentStats } from '../api';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/yourpage/posts/123456' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/p/ABC123/' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@user/video/1234567890' },
  { key: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/user/status/1234567890' },
];

export default function AddProperty() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [links, setLinks] = useState({ facebook: '', instagram: '', tiktok: '', twitter: '' });
  const [buyrent, setBuyrent] = useState({ views: '', enquiries: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setLink = (platform) => (e) => setLinks(l => ({ ...l, [platform]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name || !form.address) { setError('Name and address are required.'); return; }

    setSaving(true);
    try {
      const property = await createProperty(form);
      if (!property || !property.id) {
        throw new Error('Server is waking up — please wait 30 seconds and try again.');
      }
      const pid = property.id;

      for (const { key } of PLATFORMS) {
        if (links[key].trim()) {
          await addLink(pid, { platform: key, post_url: links[key].trim() });
        }
      }

      if (buyrent.views || buyrent.enquiries) {
        await saveBuyrentStats(pid, { views: Number(buyrent.views) || 0, enquiries: Number(buyrent.enquiries) || 0 });
        await addLink(pid, { platform: 'buyrent', post_url: 'buyrent-manual' });
      }

      setSuccess(`Property "${property.name}" added successfully!`);
      setTimeout(() => navigate('/properties'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="page-title">Add Property</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Property Details</div>
          <div className="form-row">
            <div className="form-group">
              <label>Property Name *</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. 12 Oak Street Sandton" />
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input value={form.address} onChange={set('address')} placeholder="e.g. 12 Oak Street, Sandton, 2196" />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="3 bed, 2 bath, modern kitchen…" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Link Social Media Posts</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Paste the URL of the post promoting this property on each platform.</p>
          {PLATFORMS.map(({ key, label, placeholder }) => (
            <div className="form-group" key={key}>
              <label><span className={`platform-badge ${key}`} style={{ marginRight: 8 }}>{label}</span></label>
              <input value={links[key]} onChange={setLink(key)} placeholder={placeholder} />
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 28 }}>
          <div className="section-title"><span className="platform-badge buyrent" style={{ marginRight: 8 }}>Buyrent</span> Manual Stats</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Buyrent doesn't have a public API — enter your listing stats manually.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Listing Views</label>
              <input type="number" min="0" value={buyrent.views} onChange={e => setBuyrent(b => ({ ...b, views: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Enquiries</label>
              <input type="number" min="0" value={buyrent.enquiries} onChange={e => setBuyrent(b => ({ ...b, enquiries: e.target.value }))} placeholder="0" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add Property'}
        </button>
      </form>
    </div>
  );
}
