# Auto-Update System Setup

This document describes the auto-update system implementation for Mermalaid desktop app.

## Overview

The auto-update system checks for new releases from GitHub and prompts users to update when a new version is available. Users can choose to update immediately or later.

## How It Works

1. **Update Check**: On app startup (after 3 seconds), the app checks for updates via:
   - Tauri's updater plugin (primary)
   - GitHub Releases API (fallback)

2. **Update Notification**: If a newer version is found, a notification appears in the top-right corner showing:
   - New version number
   - Release notes (expandable)
   - Update actions (Update Now, Later, View on GitHub)

3. **Update Installation**: When the user clicks "Update Now":
   - The update is downloaded
   - The app is updated automatically
   - The app restarts with the new version

## Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)

The updater is configured in the `plugins.updater` section:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/highvoltag3/mermalaid/releases/latest/download/latest.json"
      ],
      "dialog": true
    }
  }
}
```

**Note**: For production use, you'll need to:
1. Set up code signing and configure the update server endpoint with proper signing keys
2. See [Production Update Setup Guide](./PRODUCTION_UPDATE_SETUP.md) for complete instructions

The current implementation uses GitHub Releases API as a fallback, which works but requires the app to be properly signed for macOS updates.

### Update Server Setup (Production)

For a production-ready setup, see the **[Production Update Setup Guide](./PRODUCTION_UPDATE_SETUP.md)** which covers:

1. **Generating Signing Keys**: Create key pairs for update verification
2. **Code Signing**: Set up Apple Developer certificates for macOS
3. **Update Manifest Generation**: Automate creation of update manifests
4. **GitHub Actions Integration**: Automated signing and manifest generation in CI/CD
5. **Testing**: How to verify the update system works

Quick start:
```bash
# Generate signing keys
npm run update:generate-keys

# Add public key to tauri.conf.json
# Configure GitHub Secrets
# Use the release-with-updates.yml workflow
```

## Current Implementation

The system uses a hybrid approach:

1. **Primary**: Tauri's updater plugin (configured in `tauri.conf.json`)
2. **Fallback**: Direct GitHub Releases API check (`src/utils/updater.ts`)

This ensures updates work even if the Tauri updater endpoint isn't configured yet.

## Files Modified/Created

- `src-tauri/Cargo.toml` - Added `tauri-plugin-updater` dependency
- `src-tauri/src/lib.rs` - Initialized updater plugin
- `src-tauri/tauri.conf.json` - Added updater configuration
- `src/utils/updater.ts` - Update checking and installation logic
- `src/components/UpdateNotification.tsx` - UI component for update notifications
- `src/components/UpdateNotification.css` - Styling for update notifications
- `src/App.tsx` - Integrated UpdateNotification component
- `package.json` - Added `@tauri-apps/plugin-updater` dependency

## Testing

To test the auto-update system:

1. Build the app:
   ```bash
   npm run tauri:build
   ```

2. Install and run the app

3. Create a new release on GitHub with a version higher than the current app version

4. Wait a few seconds after app startup - the update notification should appear

## Future Improvements

- [ ] Set up proper update server with JSON endpoint
- [ ] Add code signing and configure public key for update verification
- [ ] Add manual "Check for Updates" option in settings
- [ ] Show update progress during download
- [ ] Add option to automatically check for updates on app start

## Troubleshooting

**Updates not showing?**
- Check that the GitHub repository is correct in `src/utils/updater.ts`
- Verify the release version is higher than the app version
- Check browser console for errors

**Update installation fails?**
- Ensure the app is properly code-signed (macOS requirement)
- Check network connectivity
- Verify GitHub release assets are accessible

**Update notification appears in web version?**
- The component checks for Tauri environment and won't show in web version
- If it appears, there may be an issue with the environment detection

