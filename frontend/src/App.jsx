import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import AddProperty from './components/AddProperty';
import ConnectPlatforms from './components/ConnectPlatforms';
import PlatformPage from './components/PlatformPage';

const PLATFORM_NAV = [
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', icon: '📘' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: '📸' },
  { key: 'tiktok',    label: 'TikTok',    color: '#69C9D0', icon: '🎵' },
  { key: 'twitter',   label: 'Twitter/X', color: '#1DA1F2', icon: '🐦' },
  { key: 'buyrent',   label: 'Buyrent',   color: '#FF6B00', icon: '🏠' },
];

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        📊 MarketTracker
        <span>Real Estate Analytics</span>
      </div>
      <nav>
        <NavLink to="/" end>🏠 Dashboard</NavLink>
        <NavLink to="/properties">🏢 Properties</NavLink>
        <NavLink to="/add">➕ Add Property</NavLink>
        <NavLink to="/connect">🔌 Connect Platforms</NavLink>
        <div className="sidebar-section-label">Platforms</div>
        {PLATFORM_NAV.map(p => (
          <NavLink key={p.key} to={`/platforms/${p.key}`}>
            <span className="sidebar-platform-dot" style={{ background: p.color }} />
            {p.icon} {p.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/add" element={<AddProperty />} />
            <Route path="/connect" element={<ConnectPlatforms />} />
            <Route path="/platforms" element={<Navigate to="/platforms/facebook" replace />} />
            <Route path="/platforms/:platform" element={<PlatformPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
