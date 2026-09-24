import React from 'react';

export default function UploadForm() {
  return (
    <div>
      <h3>Upload Media</h3>
      <form>
        <input type="text" placeholder="Title" />
        <input type="file" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}