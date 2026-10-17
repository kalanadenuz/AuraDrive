import React, { useState, useEffect, useCallback } from 'react';
import {
    getAuthToken,
    setAuthToken,
    loginUser,
    registerUser,
    uploadMedia,
    fetchUserGallery
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
            <div style={{
                minHeight: '100vh',
                background: '#0b0f19',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif'
            }}>
                <form
                    onSubmit={handleAuth}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        width: '320px',
                        padding: '30px',
                        background: '#111827',
                        border: '1px solid #334155',
                        borderRadius: '12px'
                    }}
                >
                    <h2 style={{ textAlign: 'center' }}>
                        AuraDrive: {isRegister ? 'Create Space' : 'Sign In'}
                    </h2>

                    {authError && (
                        <p style={{ color: '#f87171' }}>
                            {authError}
                        </p>
                    )}

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
                                borderRadius: '6px'
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
                            borderRadius: '6px'
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
                            borderRadius: '6px'
                        }}
                    />

                    <button
                        type="submit"
                        style={{
                            padding: '10px',
                            background: '#2563eb',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {isRegister ? 'Register' : 'Login'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsRegister(!isRegister)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#60a5fa',
                            cursor: 'pointer'
                        }}
                    >
                        {isRegister
                            ? 'Already have an account? Sign in'
                            : "Don't have an account? Register"}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0b0f19',
            color: '#fff',
            padding: '30px',
            fontFamily: 'sans-serif'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px'
            }}>
                <div>
                    <h1>AuraDrive Workspace</h1>
                    <p style={{ color: '#94a3b8' }}>
                        Personal Isolated Media Drive
                    </p>
                    {user && (
                        <p style={{ color: '#94a3b8' }}>
                            {user.full_name || user.email}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 16px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </header>

            {/* Upload Form */}
            <section style={{ marginBottom: '40px' }}>
                <h3>Upload to Personal Storage</h3>

                <form
                    onSubmit={handleUpload}
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center'
                    }}
                >
                    <input
                        type="text"
                        placeholder="Media title"
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
                            borderRadius: '6px'
                        }}
                    />

                    <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        required
                        style={{
                            padding: '8px',
                            color: '#94a3b8'
                        }}
                    />

                    <button
                        type="submit"
                        disabled={isUploading}
                        style={{
                            padding: '10px 16px',
                            background: '#2563eb',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </form>
            </section>

            {/* Gallery Grid */}
            <section>
                <h3>My Private Gallery ({items.length})</h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '20px'
                }}>
                    {items.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                background: '#111827',
                                border: '1px solid #334155',
                                borderRadius: '10px',
                                padding: '15px'
                            }}
                        >
                            {item.thumbnail_url ? (
                                <img
                                    src={item.thumbnail_url}
                                    alt={item.title}
                                    style={{
                                        width: '100%',
                                        height: '150px',
                                        objectFit: 'cover',
                                        borderRadius: '6px'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '150px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8'
                                }}>
                                    Processing WebP...
                                </div>
                            )}

                            <p>{item.title}</p>

                            <p style={{ color: '#94a3b8' }}>
                                ● {item.status}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}