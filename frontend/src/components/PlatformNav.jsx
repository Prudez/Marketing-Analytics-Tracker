import React from 'react';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = {
  facebook:  { name: 'Facebook',  color: '#1877F2', icon: '📘' },
  instagram: { name: 'Instagram', color: '#E1306C', icon: '📸' },
  tiktok:    { name: 'TikTok',    color: '#69C9D0', icon: '🎵' },
  twitter:   { name: 'Twitter/X', color: '#1DA1F2', icon: '🐦' },
  buyrent:   { name: 'Buyrent',   color: '#FF6B00', icon: '🏠' },
};

export default function PlatformNav({ activePlatform }) {
  const navigate = useNavigate();

  return (
    <div className="platform-tabs">
      {Object.entries(PLATFORMS).map(([key, cfg]) => (
        <button
          key={key}
          className={`platform-tab${activePlatform === key ? ' active' : ''}`}
          style={{ '--tab-color': cfg.color }}
          onClick={() => navigate(`/platforms/${key}`)}
        >
          <span className="platform-tab-icon">{cfg.icon}</span>
          <span>{cfg.name}</span>
        </button>
      ))}
    </div>
  );
}
