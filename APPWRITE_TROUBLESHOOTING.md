# Appwrite Sites Troubleshooting

## Issue: Seeing Appwrite Default Page Instead of Your App

If you're seeing the Appwrite starter kit page (with React and Appwrite logos), this means Appwrite is serving the default template instead of your built application.

### Solution 1: Verify Build Settings in Appwrite Console

1. Go to your **Appwrite Console** → **Sites** → Select your site
2. Navigate to **Settings** tab
3. Verify these settings are correct:

   **Install Command:**
   ```
   npm install
   ```

   **Build Command:**
   ```
   npm run build
   ```
   ⚠️ Make sure this is `npm run build` and NOT just `npm install`

   **Output Directory:**
   ```
   dist
   ```
   ⚠️ This must be exactly `dist` (the build output folder)

   **Framework Adapter:**
   ```
   static
   ```

4. **Save** the settings
5. **Redeploy** the site (click "Deploy" button)

### Solution 2: Check Deployment Method

**If using GitHub Actions deployment:**
- The CLI should automatically deploy the `dist/` folder
- Check GitHub Actions logs to ensure the build succeeded
- Verify the deployment command uses `--entrypoint dist/index.html --output dist`

**If using Appwrite Console deployment:**
- Make sure the site is configured to build (not use a template)
- The site should have "Build" enabled in settings
- Trigger a new build/deployment from the Console

### Solution 3: Verify Entry Point

1. In Appwrite Console → Your Site → Settings
2. Check if there's an **Entry Point** or **Index File** setting
3. It should be: `dist/index.html` or just `index.html` (relative to output directory)

### Solution 4: Check for Cached Deployment

1. In Appwrite Console → Your Site → **Deployments** tab
2. Look for the latest deployment
3. If it shows "Failed" or has old build artifacts, delete it
4. Create a new deployment

### Solution 5: Verify Build Output

1. After building locally, check that `dist/index.html` exists
2. Open `dist/index.html` and verify:
   - It references `/assets/index-*.js` (not `/src/main.tsx`)
   - The title is "Mermalaid" (not "Appwrite + React")
   - No references to Appwrite starter kit

3. If `dist/index.html` looks correct locally but wrong in Appwrite:
   - The build might be failing silently
   - Check build logs in Appwrite Console
   - Verify `package.json` has correct build script

### Solution 6: Force Rebuild

1. In Appwrite Console → Your Site
2. Go to **Deployments** tab
3. Click **"New Deployment"** or **"Redeploy"**
4. Wait for build to complete
5. Check deployment logs for any errors

### Solution 7: Check for Template Selection

If you created the site using "Connect from GitHub" template:
1. This might have set up a template-based deployment
2. You may need to:
   - Delete the site and recreate it using "Create from template"
   - Or manually configure build settings to override template

### Solution 8: Verify No Source Files in Root

Make sure your repository doesn't have these Appwrite starter files in the root:
- `app/page.js` or `app/page.jsx`
- Any files referencing Appwrite starter components

If they exist, they might be taking precedence. Delete them and redeploy.

### Common Mistakes

❌ **Wrong Build Command:**
```
npm install  # Wrong - this doesn't build
```

✅ **Correct Build Command:**
```
npm run build  # Correct - builds the app
```

❌ **Wrong Output Directory:**
```
build  # Wrong if your build outputs to 'dist'
```

✅ **Correct Output Directory:**
```
dist  # Matches your vite.config.ts outDir
```

❌ **Wrong Framework Adapter:**
```
ssr  # Wrong - this is for server-side rendering
```

✅ **Correct Framework Adapter:**
```
static  # Correct for static site
```

## Still Not Working?

1. **Check deployment logs** in Appwrite Console for specific errors
2. **Verify local build works**: `npm run build` should succeed
3. **Check that dist/index.html** is correct
4. **Try deploying via GitHub Actions** instead of Console (more reliable)
5. **Clear browser cache** or try incognito mode

## Expected Result

After successful deployment, you should see:
- Mermalaid editor interface
- Monaco Editor on the left
- Mermaid diagram preview on the right
- Toolbar with action buttons
- NO Appwrite starter kit page

If you still see the Appwrite default page, the deployment is not using your built files.
