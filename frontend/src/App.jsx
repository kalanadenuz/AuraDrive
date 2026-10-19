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

export default function App() {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(getStoredUser());
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  // Gallery and Modal State
  const [items, setItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadGallery = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchUserGallery();
      setItems(data);
    } catch (err) {
      console.error('Failed to sync gallery:', err);
    }
  }, [token]);

  // Periodic polling for status changes (e.g. pending -> done)
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

  // --- 1. Unauthenticated View (Login / Register) ---
  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #1e293b 0%, #0b0f19 80%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
        }}
      >
        <form
          onSubmit={handleAuth}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '36px',
            background: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 700 }}>
              {isRegister ? 'Create Workspace' : 'Sign In to AuraDrive'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Multi-Tenant Cloud Media Platform
            </p>
          </div>

          {authError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              {authError}
            </div>
          )}

          {isRegister && (
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Kalana Kuruppu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: '8px',
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            {isRegister ? 'Register Account' : 'Authenticate'}
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
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginTop: '4px',
            }}
          >
            {isRegister ? 'Already registered? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    );
  }

  // --- 2. Authenticated Dashboard ---
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f19',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Navigation */}
      <header
        style={{
          borderBottom: '1px solid #1e293b',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            A
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            AuraDrive
          </span>
          <span
            style={{
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #334155',
            }}
          >
            Isolated Tenant Space
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
              {user?.full_name || 'Authenticated User'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#ef4444',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
        }}
      >
        {/* Top Action Row: Upload form card */}
        <section style={{ display: 'flex', justifyContent: 'center' }}>
          <UploadForm onUploadSuccess={() => loadGallery()} />
        </section>

        {/* User Gallery Section */}
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>My Media Space</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Tap any item to view high-resolution preview and extracted metadata
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} stored
            </span>
          </div>

          <GalleryGrid items={items} onSelectMedia={(item) => setSelectedMedia(item)} />
        </section>
      </main>

      {/* Modal Inspector Component */}
      {selectedMedia && (
        <MediaModal item={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}