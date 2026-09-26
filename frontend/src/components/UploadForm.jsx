import React, { useState, useRef } from 'react';
import { uploadMedia } from '../api_client.js';

export default function UploadForm({ onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide both a title and an image file.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const data = await uploadMedia(file, title.trim());
      setStatusMessage({ type: 'success', text: 'Upload successful! Queued for processing.' });

      setTitle('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Error uploading file.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
        Upload New Media
      </h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
            Media Title
          </label>
          <input
            type="text"
            placeholder="e.g. Conference Notes, Setup Photo..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
            File Attachment
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files[0] || null)}
            disabled={isUploading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px',
              backgroundColor: '#0f172a',
              border: '1px dashed #475569',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: isUploading
              ? '#475569'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            boxShadow: isUploading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.35)',
            transition: 'transform 0.1s, opacity 0.2s',
          }}
        >
          {isUploading ? 'Uploading to S3...' : 'Upload & Process'}
        </button>
      </form>

      {statusMessage && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            backgroundColor:
              statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border:
              statusMessage.type === 'error'
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(34, 197, 94, 0.3)',
            color: statusMessage.type === 'error' ? '#fca5a5' : '#86efac',
          }}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}