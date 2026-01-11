<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Buffalo Markaz Masjid - Digital Signage

A modern, full-featured digital signage application for mosque displays with automatic prayer time calculations.

View your app in AI Studio: https://ai.studio/apps/drive/1xehlXdXce9OMlrbOG-7kN5GIOm-H6kbZ

## Features

### ✨ Autopilot Mode (NEW)
The app now runs on **autopilot** with automatic prayer time calculations for Buffalo, NY (14212):
- **Automatic Prayer Times**: Uses the `adhan` library to calculate accurate prayer times based on Buffalo, NY coordinates
- **Automatic Sunrise/Sunset**: Calculates and displays sunrise and sunset times daily
- **Self-Updating**: Prayer times automatically adjust throughout the year based on astronomical calculations
- **ISNA Method**: Uses the Islamic Society of North America calculation method (standard for North America)
- **Smart Iqamah Times**: Automatically sets reasonable Iqamah times (customizable via Excel or manual overrides)

### Priority System
The app uses a smart priority system for prayer times:
1. **Auto-Calculated Times** (Base/Autopilot) - Calculated daily for Buffalo, NY
2. **Excel Schedule** - Override auto-calculated times if needed
3. **Maghrib Offset** - Adjust Maghrib Iqamah time
4. **Manual Overrides** - Highest priority for specific date ranges

### Other Features
- Real-time digital clock
- Rotating slideshow (clock, announcements, weekly schedule)
- Mobile device silence alerts
- Customizable themes (Starry, Lattice, Arabesque)
- Announcement ticker with animations
- QR code for donations
- Daily Islamic wisdom via Google Gemini AI

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Configuration

### Location Settings
The app is pre-configured for **Buffalo, NY (14212)** with coordinates:
- Latitude: 42.8864
- Longitude: -78.8784

To change the location, edit `/utils/prayerCalculator.ts` and update the `BUFFALO_COORDINATES` constant.

### Calculation Method
The app uses:
- **ISNA (Islamic Society of North America)** calculation method
- **Hanafi** madhab for Asr calculation

These can be changed in `/utils/prayerCalculator.ts` if needed.

## Prayer Time Customization

While the app runs on autopilot, you can still customize prayer times:

1. **Excel Schedule**: Upload an annual schedule via Settings → Schedule tab
2. **Manual Overrides**: Set specific times for date ranges via Settings → Schedule tab
3. **Maghrib Offset**: Adjust Maghrib Iqamah time in Settings → Schedule tab

These customizations will override the auto-calculated times.
