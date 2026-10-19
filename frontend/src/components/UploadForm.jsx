// frontend/src/components/UploadForm.jsx
import React, { useState, useRef } from 'react';
import { uploadMedia } from '../api_client.js';

export default function UploadForm({ onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!title.trim()) {
      // Auto-populate title cleanly from filename without extension
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please specify a title and select an image.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const data = await uploadMedia(file, title.trim());
      setStatusMessage({ type: 'success', text: 'Uploaded successfully! Background worker dispatched.' });
      setTitle('');
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to complete upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '560px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700 }}>Upload Media Asset</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Processed into WebP with deep EXIF extraction
          </p>
        </div>
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          SQS Worker Auto-Sync
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-primary)' : previewUrl ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
            background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(10, 16, 28, 0.6)',
            borderRadius: '14px',
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelection(e.target.files[0])}
            accept="image/jpeg,image/png,image/webp,image/tiff"
            style={{ display: 'none' }}
          />

          {previewUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
              <img
                src={previewUrl}
                alt="Selected"
                style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file?.name}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Change</span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>☁️</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: '#e2e8f0' }}>
                Drag & drop your image here, or <span style={{ color: '#818cf8' }}>browse</span>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Supports PNG, JPEG, WEBP, TIFF (Up to 50MB)
              </p>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Media Label / Title
          </label>
          <input
            type="text"
            className="aura-input"
            placeholder="e.g. Project Architecture Diagram"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={isUploading || !file} className="aura-btn-primary">
          {isUploading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="spinner" /> Uploading to S3 Raw Bucket...
            </span>
          ) : (
            'Dispatch to Ingestion Pipeline'
          )}
        </button>
      </form>

      {statusMessage && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            border: `1px solid ${statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
            color: statusMessage.type === 'error' ? '#fca5a5' : '#86efac',
          }}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}