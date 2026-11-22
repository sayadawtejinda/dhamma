import React from 'react';
import { createRoot } from 'react-dom/client';
import BreakGamesGallery from './BreakGamesGallery';

// Standalone page (games.html): the break games for the teacher to share with parents. No sign-in, nothing saved, no coins paid.
createRoot(document.getElementById('root')).render(<BreakGamesGallery standalone />);
