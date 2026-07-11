import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { useStore } from './state/store';

// dev/test hook
(window as unknown as { __zork: typeof useStore }).__zork = useStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
