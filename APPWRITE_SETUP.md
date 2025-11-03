# Appwrite Sites Setup Guide

This guide walks you through creating and configuring your Appwrite Site for Mermalaid deployment.

## Step 1: Create a New Site

1. **Log in to Appwrite Console**
   - Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
   - Sign in to your account

2. **Navigate to Sites**
   - Select your project (or create one if needed)
   - Click on **"Sites"** in the left sidebar

3. **Create New Site**
   - Click the **"+ Create Site"** button
   - **⚠️ Choose "Create from template" or "Create from scratch"**
     - Do NOT choose "Connect from GitHub" (we're using GitHub Actions instead)
   - Fill in the site details:
     - **Site ID**: Choose a unique ID (e.g., `mermalaid` or `mermalaid-web`)
     - **Site Name**: `Mermalaid` (or your preferred name)
     - **Framework**: Select **"React"** or **"Static Site"**
     - **Runtime**: Select **"Node.js 20"** (or Node.js 18+)
     - **Enable Site**: ✅ Check this to make it immediately accessible

4. **Click "Create"**

**Note:** We're not using Appwrite's built-in GitHub integration because we have a GitHub Actions workflow that provides better control and visibility over deployments.

## Step 2: Configure Build Settings

After creating the site, configure the build settings:

1. **Go to Site Settings**
   - Click on your newly created site
   - Navigate to **"Settings"** tab

2. **Configure Build Commands**
   - **Install Command**: 
     ```
     npm install
     ```
   
   - **Build Command**: 
     ```
     npm run build
     ```
   
   - **Output Directory**: 
     ```
     dist
     ```

3. **Framework Adapter**
   - Select **"static"** (for static site hosting)

4. **Save Settings**

## Step 3: Get Your Site ID

You'll need the Site ID for GitHub Actions secrets:

1. In your site settings, you'll see the **Site ID** displayed
2. Copy this ID - you'll need it for the `APPWRITE_SITE_ID` secret

The Site ID is also visible in the URL:
```
https://cloud.appwrite.io/console/project-[PROJECT_ID]/sites/[SITE_ID]
```

## Step 4: Get Your Project ID

1. In Appwrite Console, go to **Settings** → **General**
2. Find your **Project ID**
3. Copy it - you'll need it for the `APPWRITE_PROJECT_ID` secret

## Step 5: Create an API Key

You'll need an API key with Sites deployment permissions:

1. Go to **Settings** → **API Keys**
2. Click **"+ Create API Key"**
3. Configure the key:
   - **Name**: `GitHub Actions Deployment` (or any descriptive name)
   - **Expiration**: Choose appropriate expiration (or leave blank for no expiration)
   - **Scopes**: 
     - ✅ Select **"sites"** scope
     - Select **"read"** and **"write"** permissions for sites
4. Click **"Create"**
5. **⚠️ IMPORTANT**: Copy the API key immediately - you won't be able to see it again!
   - This is your `APPWRITE_API_KEY` secret

## Step 6: Configure GitHub Secrets

Now add these to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

   | Secret Name | Value | Where to Find |
   |------------|-------|---------------|
   | `APPWRITE_API_KEY` | Your API key from Step 5 | Appwrite Console → Settings → API Keys |
   | `APPWRITE_PROJECT_ID` | Your Project ID | Appwrite Console → Settings → General |
   | `APPWRITE_SITE_ID` | Your Site ID from Step 3 | Site Settings or URL |
   | `APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` | (Optional - defaults to this) |

## Step 7: Test the Deployment

Once everything is configured:

1. **Push to your repository** (to `main` or `feature/appwrite-sites` branch)
2. **Check GitHub Actions**:
   - Go to **Actions** tab in your repository
   - You should see "Deploy to Appwrite Sites" workflow running
   - Wait for it to complete
3. **Check Appwrite Console**:
   - Go back to your site in Appwrite
   - Navigate to **"Deployments"** tab
   - You should see a new deployment
4. **Visit your site**:
   - Appwrite will provide a URL like: `https://[site-id].appwrite.site`
   - Click to visit your deployed site!

## Optional: Environment Variables

If you want to use environment variables (optional):

1. In Appwrite Console, go to your site → **Settings** → **Environment Variables**
2. Add any variables you need (e.g., `VITE_APP_NAME`, `VITE_APP_VERSION`)
3. **Important**: Variables are embedded at build time, so configure them in Appwrite before deploying

## Optional: Custom Domain

To use your own domain:

1. In Appwrite Console, go to your site → **Settings** → **Custom Domains**
2. Click **"+ Add Domain"**
3. Follow the DNS configuration instructions
4. SSL certificates are automatically provisioned

## Troubleshooting

### Site ID Not Found
- Make sure you've created the site in Appwrite Console
- Check that you're looking at the correct project
- Verify the Site ID in the URL or site settings

### API Key Permissions
- Ensure your API key has **"sites"** scope with **"write"** permission
- Create a new API key if permissions are incorrect

### Build Fails in GitHub Actions
- Check the GitHub Actions logs for specific errors
- Verify all secrets are set correctly
- Ensure the Site ID, Project ID, and API Key are valid

### Deployment Succeeds but Site Doesn't Update
- Appwrite Sites may take a few minutes to propagate changes
- Check the **Deployments** tab in Appwrite Console to see deployment status
- Try clearing browser cache or opening in incognito mode
