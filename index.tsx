
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA support
// Using a relative path './sw.js' to ensure correct origin resolution in sandboxed environments
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((registration) => {
        console.log('Mythos Engine Service Worker registered with scope:', registration.scope);
      })
      .catch((err) => {
        // Log error but don't break the app; PWAs might be restricted in some preview environments
        console.warn('Service Worker registration skipped or failed. PWA features may be limited in this environment.', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
