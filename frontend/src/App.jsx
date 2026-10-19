// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  loginUser,
  registerUser,
  fetchUserGallery,
} from './api_client';
import UploadForm from './components/UploadForm';
import GalleryGrid from './components/GalleryGrid';
import MediaModal from './components/MediaModal';
import './App.css';

export default function App() {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(getStoredUser());
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  const [items, setItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadGallery = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchUserGallery();
      setItems(data);
    } catch (err) {
      console.error('Gallery sync error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadGallery();
      const interval = setInterval(loadGallery, 3500);
      return () => clearInterval(interval);
    }
  }, [token, loadGallery]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      let res;
      if (isRegister) {
        res = await registerUser(email, password, fullName);
      } else {
        res = await loginUser(email, password);
      }

      setAuthToken(res.access_token);
      setStoredUser(res.user);
      setToken(res.access_token);
      setUser(res.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
    setItems([]);
    setSelectedMedia(null);
  };

  // 1. Unauthenticated Login/Register View
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--accent-gradient)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                marginBottom: '12px',
                boxShadow: '0 8px 25px var(--accent-glow)',
              }}
            >
              ⚡
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px' }}>
              {isRegister ? 'Join AuraDrive' : 'Welcome to AuraDrive'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isRegister
                ? 'Create your isolated distributed media workspace'
                : 'Sign in to access your tenant files & metadata'}
            </p>
          </div>

          {authError && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="aura-input"
                  placeholder="e.g. Kalana Kuruppu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                className="aura-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                className="aura-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="aura-btn-primary" style={{ marginTop: '8px' }}>
              {isRegister ? 'Initialize Account' : 'Sign In to Workspace'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthError('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#818cf8',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              {isRegister ? 'Already have credentials? Sign In' : 'Need an isolated partition? Create Space'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Main View
  return (
    <div className="aura-shell">
      <header className="aura-nav">
        <div className="aura-container aura-nav-inner">
          <div className="aura-logo">
            <div className="aura-logo-icon">⚡</div>
            <span>AuraDrive</span>
          </div>

          <div className="aura-user-pill">
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
              {user?.full_name || user?.email || 'Authenticated'}
            </span>
            <button onClick={handleLogout} className="aura-logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="aura-container" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {/* Upload Section */}
        <section style={{ display: 'flex', justifyContent: 'center' }}>
          <UploadForm onUploadSuccess={() => loadGallery()} />
        </section>

        {/* Media Library */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Workspace Assets</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Click any thumbnail to inspect high-resolution render and extracted EXIF metadata
              </p>
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255,255,255,0.03)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {items.length} {items.length === 1 ? 'file' : 'files'}
            </div>
          </div>

          <GalleryGrid items={items} onSelectMedia={(item) => setSelectedMedia(item)} />
        </section>
      </main>

      {/* Detail Modal */}
      {selectedMedia && <MediaModal item={selectedMedia} onClose={() => setSelectedMedia(null)} />}
    </div>
  );
}