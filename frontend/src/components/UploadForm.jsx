import React, { useState } from 'react';

export default function UploadForm() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !title) {
        alert('Please provide both a title and an image file.');
        return;
    }

    setUploadStatus('uploading');

    const formData = new FormData();

    formData.append('file', file);
    formData.append('title', title);

    try {
        const response = await fetch('http://localhost:8000/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(
                `Upload failed with status: ${response.status}`
            );
        }

        const data = await response.json();

        setUploadStatus('success');
        setFeedbackMessage(
            `Uploaded successfully! Media ID: ${data.media_id}`
        );

        setTitle('');
        setFile(null);
    } catch (err) {
        setUploadStatus('error');
        setFeedbackMessage(
            err.message || 'An error occurred during upload.'
        );
    }
};

return (
    <div
        style={{
            maxWidth: '400px',
            margin: '20px auto',
            padding: '16px',
            border: '1px solid #ccc',
        }}
    >
        <h3>Upload Media</h3>

        <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
                <label>Title:</label>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                    }}
                    required
                />
            </div>

            <div style={{ marginBottom: '12px' }}>
                <label>File:</label>

                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                />
            </div>

            <button
                type="submit"
                disabled={uploadStatus === 'uploading'}
            >
                {uploadStatus === 'uploading'
                    ? 'Uploading...'
                    : 'Submit Media'}
            </button>
        </form>

        {feedbackMessage && (
            <p style={{ marginTop: '12px' }}>
                {feedbackMessage}
            </p>
        )}
    </div>
);
}