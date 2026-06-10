import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import AddProperty from './components/AddProperty';
import ConnectPlatforms from './components/ConnectPlatforms';

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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
