import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import AddProperty from './components/AddProperty';
import ConnectPlatforms from './components/ConnectPlatforms';
import PlatformPage from './components/PlatformPage';
import Login from './components/Login';
import Register from './components/Register';

const PLATFORM_NAV = [
  { key: 'facebook', label: 'Facebook', icon: '📘', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#69C9D0' },
  { key: 'twitter', label: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
  { key: 'buyrent', label: 'Buyrent', icon: '🏠', color: '#FF6B00' },
];

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="sidebar">
      <div className="sidebar-brand">📊 MarketTracker<br />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Real Estate Analytics</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>🏠 Dashboard</NavLink>
        <NavLink to="/properties" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>🏢 Properties</NavLink>
        <NavLink to="/add" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>+ Add Property</NavLink>
        <NavLink to="/connect" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>🔌 Connect Platforms</NavLink>
      </nav>
      <div className="sidebar-section-title">PLATFORMS</div>
      <nav className="sidebar-nav">
        {PLATFORM_NAV.map(p => (
          <NavLink key={p.key} to={`/platforms/${p.key}`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span style={{ color: p.color }}>{p.icon}</span> {p.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>👤 {user.name || user.email}</div>
        <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/add" element={<AddProperty />} />
          <Route path="/connect" element={<ConnectPlatforms />} />
          <Route path="/platforms/:platform" element={<PlatformPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}