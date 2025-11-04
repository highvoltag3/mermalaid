# Production Update Server Setup

This guide explains how to set up code signing and configure the update server endpoint with proper signing keys for production use.

## Overview

For production, you need:
1. **Signing Keys**: Generate a key pair to sign updates
2. **Code Signing**: Sign the macOS app bundle
3. **Update Manifest**: Generate a JSON file that Tauri can read
4. **Update Server**: Host the manifest and update files

## Step 1: Generate Signing Keys

Tauri requires a key pair to verify update authenticity:

### Generate Keys

```bash
# Generate signing keys (run once)
npm run tauri signer generate -- -w ~/.tauri/mermalaid.key
```

This creates:
- **Private key**: `~/.tauri/mermalaid.key` (keep this SECRET!)
- **Public key**: Displayed in terminal (you'll add this to `tauri.conf.json`)

**⚠️ Important**: Store the private key securely! Losing it means you can't publish updates to existing users.

### Extract Public Key

After generation, the public key will be displayed. It looks like:
```
dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25pbmcga2V5IGZvciBNZXJtYWxhaWQKUldTT0FRSUJB...
```

### Add Public Key to Configuration

Add the public key to `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/highvoltag3/mermalaid/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

## Step 2: Code Signing for macOS

macOS requires code signing for updates to work properly.

### Option A: Apple Developer Certificate (Recommended)

1. **Get Apple Developer Account**:
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program ($99/year)

2. **Create Signing Certificate**:
   ```bash
   # Find your signing identity
   security find-identity -v -p codesigning
   ```

3. **Configure in GitHub Actions**:
   Add secrets to your GitHub repository:
   - `APPLE_CERTIFICATE`: Base64 encoded `.p12` certificate
   - `APPLE_CERTIFICATE_PASSWORD`: Password for the certificate
   - `APPLE_SIGNING_IDENTITY`: Your signing identity name
   - `APPLE_KEYCHAIN_PASSWORD`: Keychain password

4. **Update Release Workflow**:
   See `.github/workflows/release.yml` for the signing setup.

### Option B: Ad-Hoc Signing (For Testing)

For testing without a paid certificate:

```bash
# Build with ad-hoc signing
npm run tauri:build
```

Note: Ad-hoc signed apps won't work for updates in production, but are fine for testing.

## Step 3: Generate Update Manifest

The update manifest is a JSON file that tells Tauri where to find updates.

### Manual Method

Create `latest.json` in your release assets:

```json
{
  "version": "1.2.0",
  "notes": "Release notes here",
  "pub_date": "2024-01-15T12:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "UPDATE_SIGNATURE_HERE",
      "url": "https://github.com/highvoltag3/mermalaid/releases/download/v1.2.0/Mermalaid_1.2.0_x64.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "UPDATE_SIGNATURE_HERE",
      "url": "https://github.com/highvoltag3/mermalaid/releases/download/v1.2.0/Mermalaid_1.2.0_aarch64.app.tar.gz"
    }
  }
}
```

### Automated Method

Use the `generate-update-manifest.sh` script (see below) to automatically generate and sign the manifest during the release process.

## Step 4: Sign Updates

When building releases, you need to sign the update files:

```bash
# Sign the update bundle
npm run tauri signer sign -- -w ~/.tauri/mermalaid.key \
  -f Mermalaid_1.2.0_x64.app.tar.gz \
  -o Mermalaid_1.2.0_x64.app.tar.gz.sig
```

## Step 5: Update Release Workflow

The GitHub Actions workflow should:

1. Build the app with code signing
2. Create update bundles (`.app.tar.gz` files)
3. Sign the update bundles
4. Generate the update manifest JSON
5. Upload everything to GitHub Releases

## Implementation

### Scripts

We provide scripts to automate this:

- `scripts/generate-update-manifest.sh` - Generates and signs update manifest
- `scripts/sign-update.sh` - Signs update bundles

### GitHub Actions Secrets

Add these to your repository secrets:

- `TAURI_PRIVATE_KEY` - Your private signing key (base64 encoded)
- `APPLE_CERTIFICATE` - Apple signing certificate (base64 encoded)
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_SIGNING_IDENTITY` - Signing identity name
- `APPLE_KEYCHAIN_PASSWORD` - Keychain password

## Testing

1. **Generate keys locally**:
   ```bash
   npm run tauri signer generate -- -w ~/.tauri/mermalaid.key
   ```

2. **Build and test locally**:
   ```bash
   npm run tauri:build
   ```

3. **Test update flow**:
   - Install an older version
   - Create a new release with higher version
   - Launch the app and verify update notification appears

## Troubleshooting

### "Update signature verification failed"

- Ensure the public key in `tauri.conf.json` matches the private key used to sign
- Verify the update bundle was signed correctly
- Check that the manifest JSON has the correct signature

### "Code signing failed"

- Verify your Apple Developer certificate is valid
- Check that signing identity is correct
- Ensure certificate is installed in keychain

### "Update not found"

- Verify the manifest JSON is accessible at the endpoint URL
- Check that the version in manifest is higher than current app version
- Ensure the update bundle URL is correct and accessible

### "Update download failed"

- Check network connectivity
- Verify the update bundle URL is correct
- Ensure GitHub release assets are public

## Security Best Practices

1. **Never commit private keys** to the repository
2. **Store private keys securely** (use GitHub Secrets for CI/CD)
3. **Rotate keys** if compromised
4. **Use HTTPS** for all update endpoints
5. **Verify signatures** on both client and server side

## Alternative: Use Tauri's Update Server

Instead of hosting your own update server, you can use Tauri's official update server infrastructure (if available) or set up a custom server that:

- Serves the update manifest JSON
- Hosts signed update bundles
- Provides version checking API
- Handles platform/architecture detection

## Quick Start Checklist

### 1. Generate Signing Keys (One-time setup)

```bash
npm run update:generate-keys
```

Copy the public key and add it to `src-tauri/tauri.conf.json` in the `plugins.updater.pubkey` field.

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- **`TAURI_PRIVATE_KEY`**: Base64-encoded private key
  ```bash
  # Get base64 encoded private key
  cat ~/.tauri/mermalaid.key | base64 | pbcopy
  # Paste into GitHub secret
  ```

- **`APPLE_CERTIFICATE`** (optional, for code signing): Base64-encoded .p12 certificate
- **`APPLE_CERTIFICATE_PASSWORD`** (optional): Certificate password
- **`APPLE_SIGNING_IDENTITY`** (optional): Your signing identity name
- **`APPLE_KEYCHAIN_PASSWORD`** (optional): Keychain password

### 3. Update Release Workflow

The workflow `.github/workflows/release-with-updates.yml` includes:
- Code signing setup
- Update bundle creation
- Bundle signing
- Manifest generation
- Asset upload

To use it, either:
- Rename it to `release.yml` (backup the old one first), OR
- Use both workflows (one for regular releases, one for updates)

### 4. Test the Setup

1. Create a test release:
   ```bash
   git tag v1.2.0-test
   git push origin v1.2.0-test
   ```

2. Monitor the GitHub Actions workflow

3. Verify the release assets include:
   - `.dmg` file
   - `.app.tar.gz` file (update bundle)
   - `.app.tar.gz.sig` file (signature)
   - `latest.json` file (manifest)

### 5. Verify Update Endpoint

Check that the manifest is accessible:
```
https://github.com/highvoltag3/mermalaid/releases/latest/download/latest.json
```

## Next Steps

1. Generate your signing keys
2. Set up Apple Developer certificate (if targeting macOS App Store or distribution)
3. Configure GitHub Secrets
4. Update the release workflow to include signing
5. Test the update flow with a test release
6. Monitor update adoption in production

## Manual Update Manifest Creation

If you need to create the manifest manually:

```bash
# Sign the update bundle
npm run update:sign Mermalaid_1.2.0_x64.app.tar.gz

# Generate manifest
npm run update:manifest 1.2.0
```

Then upload `latest.json` to your GitHub release.

