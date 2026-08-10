import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const SAMPLE_MIGRATION = 'makebook1.playlist-sample.2026-08';
if (!localStorage.getItem(SAMPLE_MIGRATION)) {
  localStorage.removeItem('makebook1.project.v1');
  localStorage.setItem(SAMPLE_MIGRATION, '1');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
