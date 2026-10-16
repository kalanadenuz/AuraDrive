
import React, { useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  setAuthToken,
  loginUser,
  registerUser,
  uploadMedia,
  fetchUserGallery,
} from './api_client';

export default function App() {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  // Media Library State
  const [items, setItems] = useState([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadGallery = useCallback(async () => {
    if (!token) return;

    try {
      const data = await fetchUserGallery();
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadGallery();
      const interval = setInterval(loadGallery, 4000);

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
      setToken(res.access_token);
      setUser(res.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setItems([]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadFile || !uploadTitle) return;

    setIsUploading(true);

    try {
      await uploadMedia(uploadFile, uploadTitle);
      setUploadTitle('');
      setUploadFile(null);
      await loadGallery();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f19',
          color: '#f8fafc',
          padding: '1rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            background: '#1e293b',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: '#60a5fa',
            }}
          >
            AuraDrive: {isRegister ? 'Create Space' : 'Sign In'}
          </h2>

          {authError && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
              {authError}
            </p>
          )}

          <form
            onSubmit={handleAuth}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {isRegister && (
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  padding: '10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '6px',
                }}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '6px',
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '6px',
              }}
            />

            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <p
            style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.85rem',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f19',
        color: '#f8fafc',
        padding: 'clamp(1rem, 3vw, 2.5rem)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto 2rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              color: '#60a5fa',
            }}
          >
            AuraDrive Workspace
          </h1>

          <p
            style={{
              margin: 0,
              color: '#94a3b8',
              fontSize: '0.875rem',
            }}
          >
            Personal Isolated Media Drive
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </header>

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Upload Form */}
        <div
          style={{
            background: '#1e293b',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Upload to Personal Storage
          </h3>

          <form
            onSubmit={handleUpload}
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Media Title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fff',
                borderRadius: '6px',
              }}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files[0])}
              required
              style={{
                padding: '8px',
                color: '#94a3b8',
              }}
            />

            <button
              type="submit"
              disabled={isUploading}
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>

        {/* Gallery Grid */}
        <div>
          <h3>My Private Gallery ({items.length})</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
              gap: '1.5rem',
            }}
          >
            {items.map((item) => (
              <div
                key={item.media_id}
                style={{
                  background: '#1e293b',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #334155',
                }}
              >
                <div
                  style={{
                    aspectRatio: '1/1',
                    background: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: '#eab308',
                        fontSize: '0.85rem',
                      }}
                    >
                      Processing WebP...
                    </span>
                  )}
                </div>

                <div style={{ padding: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {item.title}
                  </p>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      color:
                        item.status === 'done'
                          ? '#4ade80'
                          : '#facc15',
                    }}
                  >
                    ● {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
