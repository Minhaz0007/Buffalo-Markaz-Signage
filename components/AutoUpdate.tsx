import { useEffect, useRef, useState } from 'react';

/**
 * AutoUpdate Component
 *
 * Automatically checks for new deployments on Vercel and reloads the page
 * with a smooth transition to prevent jarring blank screens on TV displays.
 *
 * How it works:
 * 1. Fetches index.html every 5 minutes to check build version
 * 2. Compares meta tag build timestamp with current version
 * 3. When new version detected, fades screen to mosque navy
 * 4. Reloads page after 500ms fade
 *
 * This ensures mosque TVs always display the latest version without manual intervention.
 */
export const AutoUpdate: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const currentVersionRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract build version from current page
  const getCurrentVersion = (): string | null => {
    const metaTag = document.querySelector('meta[name="build-version"]');
    return metaTag?.getAttribute('content') || null;
  };

  // Check for updates by fetching the index.html
  const checkForUpdates = async () => {
    try {
      // Fetch with cache-busting to ensure fresh copy
      const response = await fetch(`/index.html?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn('Failed to check for updates:', response.status);
        return;
      }

      const html = await response.text();

      // Extract build version from fetched HTML
      const versionMatch = html.match(/<meta name="build-version" content="([^"]+)"/);
      const newVersion = versionMatch ? versionMatch[1] : null;

      if (!newVersion) {
        console.warn('No build version found in fetched HTML');
        return;
      }

      // Initialize current version on first check
      if (!currentVersionRef.current) {
        currentVersionRef.current = getCurrentVersion() || newVersion;
        console.log('Auto-update initialized. Current version:', currentVersionRef.current);
        return;
      }

      // Check if version has changed
      if (newVersion !== currentVersionRef.current) {
        console.log('New version detected!', {
          current: currentVersionRef.current,
          new: newVersion
        });

        // Trigger smooth reload
        performSmoothReload();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      // Don't block on errors - continue checking on next interval
    }
  };

  // Perform smooth reload with fade transition
  const performSmoothReload = () => {
    console.log('Initiating smooth reload...');
    setIsUpdating(true);

    // Reload after fade completes
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  useEffect(() => {
    // Initial check after 30 seconds (allow app to fully load first)
    const initialTimeout = setTimeout(() => {
      checkForUpdates();
    }, 30000);

    // Set up periodic checks every 5 minutes
    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(initialTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Render fade overlay when updating
  if (!isUpdating) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-mosque-navy transition-opacity duration-500 flex items-center justify-center"
      style={{ opacity: 1 }}
    >
      <div className="text-white text-2xl font-semibold animate-pulse">
        Updating...
      </div>
    </div>
  );
};
