const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  // Get primary display dimensions for fullscreen TV display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: false, // User can toggle fullscreen with F11 or Cmd+Ctrl+F
    autoHideMenuBar: true, // Hide menu bar for cleaner TV display
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Enable localStorage and IndexedDB for offline mode
      partition: 'persist:buffalo-markaz'
    },
    title: 'Buffalo Markaz Prayer Times',
    backgroundColor: '#1a1a2e', // Match app theme
    show: false, // Don't show until ready-to-show
  });

  // Load the app
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Optional: Auto-fullscreen for TV display (uncomment if desired)
    // mainWindow.setFullScreen(true);
  });

  // Prevent window from being closed accidentally
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      const response = require('electron').dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Cancel', 'Quit'],
        title: 'Confirm',
        message: 'Are you sure you want to quit the Prayer Times app?'
      });

      if (response === 1) {
        app.isQuitting = true;
        app.quit();
      }
    }
  });

  // Handle navigation - prevent external links from leaving the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser instead of new window
    if (url.startsWith('http') && !url.includes('localhost')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();

  // macOS: Re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app updates and crashes gracefully
app.on('will-quit', () => {
  // Cleanup if needed
  console.log('Buffalo Markaz Prayer Times app is quitting...');
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // If user tries to launch another instance, focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
