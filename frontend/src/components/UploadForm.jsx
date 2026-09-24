import React, { useState } from 'react';

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);

  return (
    <div>
      <h3>Upload Media</h3>
      <form>
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