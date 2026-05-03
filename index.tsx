import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Recovery screen shown when the top-level ErrorBoundary catches an unhandled crash
// anywhere in the React tree (e.g. SettingsModal crash, hooks violation, etc.).
// Hides the #nav-splash on mount so the user sees this instead of a permanent blue screen.
function TopLevelErrorFallback() {
  React.useEffect(() => {
    const splash = document.getElementById('nav-splash');
    if (splash) splash.style.display = 'none';
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0B1E3B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontFamily: 'sans-serif', textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>Buffalo Markaz Masjid</div>
      <div style={{ fontSize: '18px', color: '#aaa', marginBottom: '32px' }}>The display encountered an error. Tap to reload.</div>
      <button
        onClick={() => { sessionStorage.clear(); window.location.replace(window.location.pathname); }}
        style={{ padding: '14px 28px', background: '#D4AF37', color: '#0B1E3B', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Reload Display
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<TopLevelErrorFallback />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
