import React, { useState } from 'react';

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });

    setTitle('');
  };

  return (
    <div>
      <h3>Upload Media</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}