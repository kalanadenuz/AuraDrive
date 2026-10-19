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
            <div className="auth-header-icon">
              ⚡
            </div>
            <h2 className="auth-title">
              {isRegister ? 'Join AuraDrive' : 'Welcome to AuraDrive'}
            </h2>
            <p className="auth-subtitle">
              {isRegister
                ? 'Create your secure cloud media account'
                : 'Sign in to access your cloud photos and files'}
            </p>
          </div>

          {authError && (
            <div className="auth-error-banner">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <div>
                <label className="auth-field-label" style={{ display: 'block', marginBottom: '6px' }}>
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
              <label className="auth-field-label" style={{ display: 'block', marginBottom: '6px' }}>
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
              <label className="auth-field-label" style={{ display: 'block', marginBottom: '6px' }}>
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
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>

            <button
              type="button"
              className="aura-auth-toggle-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthError('');
              }}
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
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

      <main className="aura-container aura-main-content">
        {/* Upload Section */}
        <section style={{ display: 'flex', justifyContent: 'center' }}>
          <UploadForm onUploadSuccess={() => loadGallery()} />
        </section>

        {/* Media Library */}
        <section>
          <div className="aura-section-header">
            <div>
              <h2 className="aura-section-title">Your Cloud Gallery</h2>
              <p className="aura-section-subtitle">
                Click any photo to view in high resolution and see image details
              </p>
            </div>
            <div className="aura-asset-counter">
              {items.length} {items.length === 1 ? 'item' : 'items'}
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