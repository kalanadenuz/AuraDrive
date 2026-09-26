import React, { useEffect, useState } from 'react';
import GalleryGrid from './components/GalleryGrid';

export default function App() {
  const [items, setItems] = useState([]);

  const loadMedia = async () => {
    const res = await fetch('http://localhost:8000/media/list');
    const data = await res.json();
    setItems(data.items || []);
  };

  useEffect(() => {
    loadMedia();

    const timer = setInterval(loadMedia, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <h1>AuraDrive</h1>
      <GalleryGrid items={items} />
    </div>
  );
}