import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Safety-net: if React fails to mount within 8 s (e.g. uncaught error before
// ErrorBoundary catches it), force-hide the #nav-splash so the screen doesn't
// stay permanently navy.  App.tsx's first useEffect is the NORMAL path and
// hides it after the first successful render, usually within < 500 ms.
setTimeout(() => {
  const splash = document.getElementById('nav-splash');
  if (splash && splash.style.display !== 'none') {
    splash.style.display = 'none';
  }
}, 8_000);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
