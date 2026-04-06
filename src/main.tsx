import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialise Supabase auth listener — must be imported before App mounts
// so onAuthStateChange fires before any component reads UIStore
import './lib/supabase';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
