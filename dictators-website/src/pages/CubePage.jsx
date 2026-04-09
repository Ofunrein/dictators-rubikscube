import React from 'react';

const CUBE_APP_URL = import.meta.env.VITE_CUBE_APP_URL ?? 'http://localhost:5174';

function CubePage() {
  return (
    <iframe
      src={CUBE_APP_URL}
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="Rubik's Cube App"
    />
  );
}

export default CubePage;