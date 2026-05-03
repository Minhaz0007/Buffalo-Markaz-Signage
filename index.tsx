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
// Hides the #nav-splash on mount and auto-reloads after 30 s — no tap needed since
// this display runs unattended 24/7.
function TopLevelErrorFallback() {
  const [countdown, setCountdown] = React.useState(30);

  React.useEffect(() => {
    // Hide the nav-splash so this message is visible over the navy background
    const splash = document.getElementById('nav-splash');
    if (splash) splash.style.display = 'none';

    // Countdown ticker
    const ticker = setInterval(() => setCountdown(prev => Math.max(0, prev - 1)), 1000);

    // Auto-reload after 30 s — gives time for any deployment to settle
    const timer = setTimeout(() => {
      sessionStorage.clear();
      window.location.replace(window.location.pathname);
    }, 30_000);

    return () => { clearInterval(ticker); clearTimeout(timer); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0B1E3B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontFamily: 'sans-serif', textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>Buffalo Markaz Masjid</div>
      <div style={{ fontSize: '18px', color: '#aaa', marginBottom: '8px' }}>Display updating…</div>
      <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>Auto-reloading in {countdown}s…</div>
      <button
        onClick={() => { sessionStorage.clear(); window.location.replace(window.location.pathname); }}
        style={{ padding: '12px 24px', background: '#D4AF37', color: '#0B1E3B', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Reload Now
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
