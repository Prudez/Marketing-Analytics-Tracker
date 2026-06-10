import React, { useEffect, useState } from 'react';
import { getPlatformStatus } from '../api';

const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    envVars: ['FACEBOOK_PAGE_TOKEN'],
    docsUrl: 'https://developers.facebook.com/docs/graph-api/overview',
    instructions: 'Create a Facebook App → get a Page Access Token with pages_read_engagement and read_insights permissions.',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    envVars: ['INSTAGRAM_ACCESS_TOKEN'],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    instructions: 'Use Facebook for Developers → Instagram Graph API → generate a long-lived access token.',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#69C9D0',
    envVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    docsUrl: 'https://developers.tiktok.com/doc/overview',
    instructions: 'Register a TikTok app → apply for Research API access → copy client key and secret.',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    color: '#1DA1F2',
    envVars: ['TWITTER_BEARER_TOKEN'],
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-api',
    instructions: 'Sign up at developer.twitter.com → create a project/app → copy the Bearer Token.',
  },
  {
    key: 'buyrent',
    label: 'Buyrent',
    color: '#FF6B00',
    envVars: [],
    docsUrl: 'https://www.buyrent.co.za',
    instructions: 'No public API available. Stats are entered manually per property on the Add Property page.',
    manual: true,
  },
];

export default function ConnectPlatforms() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformStatus().then(setStatus).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="page-title">Connect Platforms</h1>
      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
        API keys are stored in <code style={{ fontFamily: 'monospace' }}>backend/.env</code>. Never commit this file to git.
      </div>

      <div className="card">
        {PLATFORMS.map(p => (
          <div key={p.key} className="platform-row">
            <div className="platform-icon" style={{ background: `${p.color}22`, color: p.color }}>
              {p.label.slice(0, 2).toUpperCase()}
            </div>
            <div className="platform-info">
              <div className="p-name">{p.label}</div>
              {p.envVars.length > 0 && (
                <div className="p-env">{p.envVars.join(', ')}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.instructions}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {loading ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>…</span>
              ) : p.manual ? (
                <span style={{ fontSize: 12, background: 'rgba(99,102,241,.15)', color: '#818cf8', padding: '3px 10px', borderRadius: 10 }}>Manual</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span className={`dot ${status?.[p.key] ? 'green' : 'red'}`} />
                  {status?.[p.key] ? 'Connected' : 'Not configured'}
                </span>
              )}
              <a href={p.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>Docs ↗</a>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title">Setup Guide</div>
        <ol style={{ paddingLeft: 20, fontSize: 14, color: 'var(--muted)', lineHeight: 1.8 }}>
          <li>Copy <code style={{ fontFamily: 'monospace', color: 'var(--text)' }}>backend/.env.example</code> → <code style={{ fontFamily: 'monospace', color: 'var(--text)' }}>backend/.env</code></li>
          <li>Fill in the tokens for each platform you want to track</li>
          <li>Restart the backend: <code style={{ fontFamily: 'monospace', color: 'var(--text)' }}>npm run dev --prefix backend</code></li>
          <li>Add a property and paste the post URLs — analytics will sync automatically</li>
        </ol>
      </div>
    </div>
  );
}
