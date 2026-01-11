# macOS Desktop App Setup Guide

This guide will help you convert your Buffalo Markaz Prayer Times web app into a native macOS desktop application that syncs with Supabase.

## What You'll Get

- **Native macOS App**: A standalone `.app` file that runs without a browser
- **Cloud Sync**: Continues to sync with your Supabase database (just like the web version)
- **Offline Mode**: Full offline capabilities using localStorage
- **Installer**: Professional `.dmg` installer for easy distribution
- **Auto-updates**: Can be extended with auto-update functionality

## Prerequisites

Before you begin, make sure you have:

1. **macOS Computer**: You need a Mac to build macOS apps
2. **Node.js**: Version 18 or higher (check with `node --version`)
3. **Supabase Credentials**: Your existing `.env` file with Supabase keys

## Step 1: Install Dependencies

On your macOS machine, navigate to your project directory and run:

```bash
npm install
```

This will install all the new Electron dependencies:
- `electron` - The Electron framework
- `electron-builder` - For building and packaging
- `concurrently` - To run dev server and Electron together
- `wait-on` - To wait for dev server to start
- `cross-env` - For cross-platform environment variables

## Step 2: Set Up Environment Variables

Make sure your `.env` file exists with your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

The desktop app will use the same Supabase database as your web app.

## Step 3: (Optional) Add App Icon

To have a professional-looking app icon:

1. Create a 1024x1024 PNG image of your app icon
2. Convert it to `.icns` format using an online tool like [CloudConvert](https://cloudconvert.com/png-to-icns) or the `iconutil` command
3. Save it as `build/icon.icns`

If you skip this step, Electron will use a default icon.

## Step 4: Development Mode

Test the app in development mode:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server on port 5173
2. Wait for the server to be ready
3. Launch the Electron app window
4. Enable hot-reload for development

The app window should open with your prayer times display. Try these features:
- Check if it connects to Supabase
- Upload an Excel file in settings
- Verify offline mode (disconnect internet)
- Test manual overrides and announcements

## Step 5: Build the macOS App

When you're ready to create the standalone app:

### Option A: Universal Build (Recommended)
Builds for both Intel and Apple Silicon Macs:

```bash
npm run electron:build:mac
```

### Option B: Architecture-Specific Builds

For Apple Silicon (M1/M2/M3) Macs only:
```bash
npm run electron:build:mac:arm64
```

For Intel Macs only:
```bash
npm run electron:build:mac:x64
```

## Step 6: Find Your Built App

After building, you'll find:

```
electron-dist/
├── mac/
│   └── Buffalo Markaz Prayer Times.app    # The actual app
├── Buffalo Markaz Prayer Times-2.0.0.dmg   # Installer (drag to Applications)
└── Buffalo Markaz Prayer Times-2.0.0-mac.zip  # Zip archive
```

### Installation Options:

1. **DMG Installer** (Recommended for distribution):
   - Double-click `Buffalo Markaz Prayer Times-2.0.0.dmg`
   - Drag the app to the Applications folder
   - Eject the DMG
   - Open from Applications

2. **Direct App**:
   - Copy `Buffalo Markaz Prayer Times.app` from `electron-dist/mac/` to `/Applications`
   - Right-click and select "Open" (first time only, due to Gatekeeper)

## Step 7: First Launch

When you first open the app:

1. macOS may show a security warning (unsigned app)
2. Go to System Preferences → Security & Privacy
3. Click "Open Anyway" at the bottom
4. The app will launch

**Note**: For public distribution, you'd need to sign the app with an Apple Developer certificate ($99/year).

## Features of the Desktop App

### Cloud Sync
- Automatically syncs with your Supabase database
- Same data across web app and desktop app
- Changes sync in real-time

### Offline Mode
- Full offline functionality using localStorage
- Works without internet for 30+ days
- Syncs changes when internet returns

### TV Display Mode
- Auto-adjusts to screen resolution
- F11 or Cmd+Ctrl+F for fullscreen
- Clean interface without browser chrome

### Prevent Accidental Closing
- Confirmation dialog when closing
- Prevents accidental quits during display

## Deployment Scenarios

### Scenario 1: Single TV Setup
1. Build the app on your Mac
2. Copy the `.dmg` installer to a USB drive
3. Install on the Mac Mini connected to your TV
4. Launch and configure once
5. App auto-loads settings from Supabase

### Scenario 2: Multiple Locations
1. Build once, distribute the `.dmg` to all locations
2. All installations sync with the same Supabase database
3. Update prayer times in one place, syncs everywhere

### Scenario 3: Web + Desktop
- Keep the Vercel deployment for remote access
- Use desktop app for local TV displays
- Both use the same Supabase database
- Perfect redundancy

## Updating the App

To release updates:

1. Make your code changes
2. Update version in `package.json` (e.g., `2.0.0` → `2.1.0`)
3. Rebuild: `npm run electron:build:mac`
4. Distribute the new `.dmg` file

**Future Enhancement**: You can add auto-update functionality using `electron-updater`.

## Troubleshooting

### App won't open (Security warning)
- Right-click app → Open (instead of double-clicking)
- Or: System Preferences → Security & Privacy → Open Anyway

### Can't connect to Supabase
- Check your `.env` file has correct credentials
- Verify internet connection
- Check macOS firewall settings

### Build fails
- Make sure you're on macOS (can't build .app on Windows/Linux)
- Update Xcode Command Line Tools: `xcode-select --install`
- Clear cache: `rm -rf node_modules electron-dist && npm install`

### Dev mode won't start
- Port 5173 might be in use: `lsof -ti:5173 | xargs kill -9`
- Try: `npm run dev` first to test Vite alone

## Comparing to Web Version

| Feature | Web App (Vercel) | Desktop App | Both |
|---------|-----------------|-------------|------|
| Access anywhere | ✅ | ❌ | |
| No browser needed | ❌ | ✅ | |
| Native macOS feel | ❌ | ✅ | |
| Supabase sync | ✅ | ✅ | ✅ |
| Offline mode | ✅ | ✅ | ✅ |
| Auto-updates | ✅ (instant) | Manual | |
| TV fullscreen | ✅ | ✅ | ✅ |

## Advanced Configuration

### Change App Name
Edit `package.json`:
```json
"build": {
  "productName": "Your Custom Name",
  "appId": "com.yourorg.yourapp"
}
```

### Enable Auto-Fullscreen
Edit `electron-main.js` line 28, uncomment:
```javascript
// mainWindow.setFullScreen(true);
```

### Disable Quit Confirmation
Edit `electron-main.js` lines 42-56, remove the confirmation dialog.

### Custom Window Size
Edit `electron-main.js` lines 11-12:
```javascript
width: 1920,  // Your desired width
height: 1080, // Your desired height
```

## Code Signing (Optional - For Public Distribution)

To distribute outside your organization without security warnings:

1. **Join Apple Developer Program** ($99/year)
   - Sign up at https://developer.apple.com

2. **Get Developer Certificate**
   - Open Keychain Access
   - Request certificate from Certificate Authority
   - Upload to Apple Developer portal

3. **Update package.json**:
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false
}
```

4. **Build with signing**:
```bash
npm run electron:build:mac
```

## Next Steps

1. ✅ **Test thoroughly** in development mode
2. ✅ **Build your first .dmg**
3. ✅ **Install on target Mac**
4. ✅ **Verify Supabase sync works**
5. ✅ **Upload Excel schedule**
6. ✅ **Test offline mode**
7. ✅ **Deploy to TV display**

## Support and Resources

- **Electron Docs**: https://www.electronjs.org/docs
- **electron-builder**: https://www.electron.build
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Check your repository issues

## Summary

You now have:
- ✅ Complete Electron setup
- ✅ macOS build configuration
- ✅ Development environment
- ✅ Production build scripts
- ✅ Supabase cloud sync maintained
- ✅ Offline mode preserved
- ✅ Professional .dmg installer

Your app works exactly like Claude Desktop, ChatGPT, or any other Electron-based app - native macOS experience with cloud synchronization!
