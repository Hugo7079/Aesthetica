import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register service worker for PWA install (no-op in dev)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/Aesthetica/sw.js');
      // Notify UI when an update is found
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker?.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              window.dispatchEvent(new CustomEvent('sw:updatefound'));
            }
          }
        });
      });
    } catch (err) {
      console.warn('Service worker registration failed', err);
    }

    // Forward SW messages as window events
    navigator.serviceWorker.addEventListener('message', (event) => {
      window.dispatchEvent(new CustomEvent('sw:message', { detail: event.data }));
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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
