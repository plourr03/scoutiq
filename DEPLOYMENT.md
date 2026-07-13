# Firebase Deployment Guide for ScoutIQ

## Your Firebase Project Configuration
- **Project ID**: scoutiq-94b8e
- **Project Number**: 933278883830
- **Hosting URL**: https://scoutiq-94b8e.firebaseapp.com (or your custom domain)

## Quick Deployment Steps

### 1. Login to Firebase (One-time setup)
Open a terminal and run:
```bash
firebase login
```
This will open a browser where you can login with the Google account that owns the Firebase project.

### 2. Deploy Your Website
From the project directory, run:
```bash
cd c:\Users\bobby\repo\scoutiq
firebase deploy --only hosting
```

That's it! Your website will be deployed.

## What's Already Configured

✅ **firebase.json** - Hosting configuration pointing to `build/web`
✅ **.firebaserc** - Project set to `scoutiq-94b8e`
✅ **build/web/** - Production-ready website files
✅ **Google Search Console verification file** included

## After Deployment

Your website will be available at:
- **Default URL**: https://scoutiq-94b8e.firebaseapp.com
- **Custom Domain** (if configured): https://scoutiq.com

### Verify Your Deployment
1. Visit your website URL
2. Test all features:
   - Hero section animations
   - "Explore Our Products" button scrolling
   - Product cards
   - Privacy Policy link
   - Terms of Service link
   - "Get in Touch" email button
3. Verify Google Search Console at: https://scoutiq-94b8e.firebaseapp.com/google9273129ebdea3e62.html

## Optional: Add Analytics

Your Firebase config is ready. To enable analytics tracking, add this to your `web/index.html`:

```html
<!-- Add before closing </body> tag -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
  
  const firebaseConfig = {
    apiKey: "AIzaSyAoGwNu4B0voD9Ak6yx7gNVRNqevIPIrgw",
    authDomain: "scoutiq-94b8e.firebaseapp.com",
    projectId: "scoutiq-94b8e",
    storageBucket: "scoutiq-94b8e.firebasestorage.app",
    messagingSenderId: "933278883830",
    appId: "1:933278883830:web:2ed5fe431673a43650b1d7",
    measurementId: "G-FM25YTPE25"
  };
  
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
```

## Deployment Commands Reference

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# View deployment history
firebase hosting:channel:list

# Preview before deploying (creates preview URL)
firebase hosting:channel:deploy preview

# Check deployment status
firebase projects:list
```

## Troubleshooting

**Error: "Please make sure the project exists"**
- Run `firebase login` to authenticate
- Verify you're logged in with the correct Google account

**Error: "Permission denied"**
- Make sure your Google account has Owner or Editor role on the Firebase project

**Changes not showing up?**
- Clear your browser cache or use incognito mode
- Run `flutter build web --release` before deploying

## Custom Domain Setup (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., scoutiq.com)
4. Follow DNS configuration steps
5. Firebase will provide verification and SSL certificates automatically

## Contact
Questions? Email: scoutiq12@gmail.com
