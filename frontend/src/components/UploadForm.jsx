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
      setStatusMessage({ type: 'error', text: 'Please enter a title and select a photo.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const data = await uploadMedia(file, title.trim());
      setStatusMessage({ type: 'success', text: 'Uploaded successfully! Your photo is being processed.' });
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
    <div className="aura-upload-card">
      <div className="aura-upload-header">
        <div>
          <h3 className="aura-upload-title">Upload Media</h3>
          <p className="aura-upload-subtitle">
            Fast cloud backup with automatic photo optimization
          </p>
        </div>
        <div className="aura-sync-badge">
          Automatic Cloud Sync
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dropzone */}
        <div
          className={`aura-dropzone ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Change</span>
            </div>
          ) : (
            <div>
              <div className="aura-dropzone-icon">☁️</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: '#e2e8f0' }}>
                Drag & drop your image here, or <span className="aura-dropzone-browse">browse</span>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Supports PNG, JPEG, WEBP, TIFF (Up to 15MB)
              </p>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div>
          <label className="auth-field-label" style={{ display: 'block', marginBottom: '6px' }}>
            Photo Title
          </label>
          <input
            type="text"
            className="aura-input"
            placeholder="e.g. Summer Vacation, Mountain Sunset"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={isUploading || !file} className="aura-btn-primary">
          {isUploading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="spinner" /> Uploading to cloud...
            </span>
          ) : (
            'Upload to Cloud'
          )}
        </button>
      </form>

      {statusMessage && (
        <div className={`aura-status-banner ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}