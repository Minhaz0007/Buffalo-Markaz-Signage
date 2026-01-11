# Deployment Guide - Vercel

## Prerequisites
- GitHub account
- Vercel account (free tier works perfectly)
- Your code pushed to GitHub

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Ensure all changes are committed and pushed:**
   ```bash
   git status
   git add -A
   git commit -m "Ready for deployment"
   git push
   ```

### Step 2: Create vercel.json Configuration

Create a `vercel.json` file in your project root (already done if you run the script below).

This ensures Vercel handles the SPA routing correctly.

### Step 3: Set Up Environment Variables

1. Get your Gemini API key from: https://aistudio.google.com/app/apikey
2. Keep it ready - you'll need it in Step 5

### Step 4: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? Press Enter (uses folder name)
   - Directory? Press Enter (current directory)
   - Override settings? **N**

5. Set environment variable:
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   - Paste your Gemini API key when prompted
   - Select: Production, Preview, Development (all three)

6. Deploy to production:
   ```bash
   vercel --prod
   ```

**Option B: Using Vercel Dashboard (Easier for Beginners)**

1. Go to https://vercel.com/
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   - Click "Environment Variables"
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key
   - Select all environments (Production, Preview, Development)

6. Click "Deploy"

### Step 5: Verify Deployment

1. Wait for build to complete (usually 1-2 minutes)
2. Click on the deployment URL (e.g., `your-app.vercel.app`)
3. Verify:
   - Prayer times are showing (auto-calculated)
   - Clock is working
   - Settings modal opens
   - Theme changes work

### Step 6: Set Up Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `signage.buffalomarkaz.com`)
4. Follow DNS configuration instructions

## Automatic Deployments

Once connected to GitHub:
- Every push to `main` branch = Production deployment
- Every pull request = Preview deployment
- Vercel will automatically rebuild and deploy

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure `package.json` has all dependencies
- Verify `vite.config.ts` is correct

### Environment Variable Issues
- Ensure `GEMINI_API_KEY` is set in Vercel dashboard
- Variable must be prefixed in code properly
- Redeploy after adding variables

### Prayer Times Not Showing
- The app uses client-side calculation (adhan library)
- No server-side config needed
- Times auto-calculate in the browser

## Performance Tips

1. **Enable Edge Network**: Already optimized for Vercel Edge
2. **Image Optimization**: Not applicable (SVG-based graphics)
3. **Caching**: Vercel automatically caches static assets

## Monitoring

- View analytics in Vercel dashboard
- Check deployment logs for errors
- Monitor function invocations (Gemini API calls)

## Cost

- **Vercel Free Tier**: Sufficient for most mosques
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Automatic SSL

- If you exceed limits, upgrade to Pro ($20/month)
