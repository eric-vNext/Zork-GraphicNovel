import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { useStore } from './state/store';

// dev/test hook
(window as unknown as { __zork: typeof useStore }).__zork = useStore;

// Offline play (docs/handoff-2026-07-11.md item 6). Skip in dev/test so
// vitest's jsdom environment and `vite dev` HMR never fight a stale cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
