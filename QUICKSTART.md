# 🚀 Quick Start Guide

## Deploy to Vercel in 5 Minutes

### Step 1: Get Your Gemini API Key (1 minute)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key (starts with `AIza...`)

### Step 2: Push to GitHub (1 minute)
```bash
git add -A
git commit -m "Ready for deployment"
git push
```

### Step 3: Deploy to Vercel (3 minutes)

#### Easy Way (Using Vercel Dashboard):
1. Go to https://vercel.com/
2. Sign in with GitHub
3. Click "Add New Project"
4. Select your repository
5. **Important**: Add Environment Variable:
   - Name: `VITE_GEMINI_API_KEY`
   - Value: Paste your Gemini API key from Step 1
6. Click "Deploy"
7. Wait 1-2 minutes
8. Done! 🎉

Your app will be live at: `https://your-app-name.vercel.app`

---

## Local Development

### First Time Setup:
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local and add your Gemini API key
# VITE_GEMINI_API_KEY=your_key_here

# Start development server
npm run dev
```

Visit: http://localhost:3000

### Available Commands:
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## What Works Out of the Box

✅ **Automatic Prayer Times** - Calculates for Buffalo, NY (14212)
✅ **Auto-updating throughout the year** - Based on astronomy
✅ **Real-time clock**
✅ **Rotating slideshow**
✅ **Customizable themes**
✅ **Mobile silence alerts**
✅ **Announcement ticker**
✅ **Daily Islamic wisdom** (needs Gemini API key)

---

## Customization

### Change Location:
Edit `utils/prayerCalculator.ts`:
```typescript
const BUFFALO_COORDINATES = new Coordinates(YOUR_LAT, YOUR_LONG);
```

### Change Mosque Info:
Edit `constants.ts`:
```typescript
export const MOSQUE_NAME = "Your Mosque Name";
export const ADDRESS = "Your Address";
```

### Add Custom Announcements:
1. Click Settings button (bottom right)
2. Go to "Announcements & Alerts" tab
3. Add your announcements

### Upload Prayer Schedule:
1. Click Settings → Schedule tab
2. Upload Excel file with annual schedule
3. Auto-calculated times are still used as base

---

## Need Help?

- **Deployment Issues**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Database/Sync**: See [DATABASE_GUIDE.md](DATABASE_GUIDE.md)
- **General Info**: See [README.md](README.md)

---

## Pro Tips

💡 **Fullscreen Mode**: Press `Ctrl+F` (or `Cmd+F` on Mac)
💡 **Settings Access**: Settings button only visible when not in fullscreen
💡 **Auto-Hide**: Use browser kiosk mode for permanent display
💡 **Offline**: App works offline (except Gemini AI quotes - uses cached ones)

---

## Troubleshooting

**No Gemini quotes showing?**
- Check if `VITE_GEMINI_API_KEY` is set in Vercel
- Fallback quotes will show if API fails
- Quotes are cached for 24 hours

**Prayer times wrong?**
- Check if location coordinates are correct
- Verify timezone on the device
- Times calculate client-side (in browser)

**Settings not saving?**
- Check browser localStorage isn't blocked
- Clear cache and try again
- For multi-device: See [DATABASE_GUIDE.md](DATABASE_GUIDE.md)
