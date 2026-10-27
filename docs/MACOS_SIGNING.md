# macOS Code Signing and Notarization

This guide explains how to configure macOS code signing and notarization for Mermalaid releases.

## Overview

Apple requires apps distributed outside the Mac App Store to be:
1. **Signed** with a Developer ID Application certificate
2. **Notarized** by Apple (submitted for automated security checks)
3. **Stapled** with the notarization ticket (embedded in the DMG for offline verification)

Once configured, the release workflow handles all of this automatically when you push a `v*` tag.

## Prerequisites

- Active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- A **Developer ID Application** certificate (not a development or distribution certificate)

## GitHub Secrets Required

Configure these secrets in your repository settings (Settings → Secrets and variables → Actions → Repository secrets):

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate file |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | Full certificate name, e.g., `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Your Apple ID email address |
| `APPLE_PASSWORD` | App-specific password (NOT your Apple ID password) |
| `APPLE_TEAM_ID` | 10-character Team ID from Apple Developer portal |

### Minimal Setup (Signing Only)

If you only want to sign the app (without notarization), you only need:
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`

Users will still see a Gatekeeper warning on first launch, but they can right-click → Open to bypass it.

### Full Setup (Signing + Notarization)

For a seamless user experience with no Gatekeeper warnings, add all six secrets.

## Step-by-Step Setup

### 1. Create a Developer ID Application Certificate

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Enter your email, select "Saved to disk", and save the CSR file
4. Go to [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list)
5. Click **+** to create a new certificate
6. Select **Developer ID Application** and follow the prompts
7. Upload your CSR file
8. Download and double-click the certificate to install it in Keychain Access

### 2. Export the Certificate as .p12

1. Open **Keychain Access**
2. In the **login** keychain, find your **Developer ID Application** certificate
3. Expand the certificate to see the private key underneath
4. Select **both** the certificate and private key (Cmd-click)
5. Right-click → **Export 2 items...**
6. Save as `.p12` format
7. Enter a strong password (you'll need this for `APPLE_CERTIFICATE_PASSWORD`)

### 3. Base64 Encode the Certificate

```bash
base64 -i ~/Desktop/certificate.p12 | pbcopy
```

This copies the base64-encoded certificate to your clipboard. Paste it as the `APPLE_CERTIFICATE` secret.

Alternatively, to save to a file:
```bash
base64 -i ~/Desktop/certificate.p12 -o ~/Desktop/certificate.txt
```

### 4. Find Your Signing Identity

Run this command to list your signing identities:

```bash
security find-identity -v -p codesigning
```

Look for the line containing "Developer ID Application". Copy the full name including the Team ID in parentheses:

```
Developer ID Application: Your Name (ABC123XYZ)
```

This is your `APPLE_SIGNING_IDENTITY`.

### 5. Find Your Team ID

Your Team ID is the 10-character alphanumeric code in parentheses at the end of your signing identity (e.g., `ABC123XYZ`).

You can also find it at [Apple Developer → Membership](https://developer.apple.com/account/#/membership/).

### 6. Create an App-Specific Password

Apple requires an app-specific password for notarization (your regular Apple ID password won't work):

1. Go to [appleid.apple.com](https://appleid.apple.com/)
2. Sign in and go to **Security** or **Sign-In and Security**
3. Under **App-Specific Passwords**, click **Generate**
4. Enter a label like "Mermalaid Notarization"
5. Copy the generated password

This is your `APPLE_PASSWORD`.

### 7. Add Secrets to GitHub

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Add each secret:
- `APPLE_CERTIFICATE`: The base64 string from step 3
- `APPLE_CERTIFICATE_PASSWORD`: The password from step 2
- `APPLE_SIGNING_IDENTITY`: The full name from step 4
- `APPLE_ID`: Your Apple ID email
- `APPLE_PASSWORD`: The app-specific password from step 6
- `APPLE_TEAM_ID`: The 10-character Team ID from step 5

## Testing the Setup

1. Create and push a test tag: `git tag v0.0.1-test && git push origin v0.0.1-test`
2. Watch the Actions workflow run
3. Check the "Verify code signing and notarization" step for confirmation
4. Download the DMG and verify:
   ```bash
   codesign -dv --verbose=2 /path/to/Mermalaid.app
   xcrun stapler validate /path/to/Mermalaid.dmg
   ```
5. Delete the test release and tag when done

## Alternative: App Store Connect API Key

Instead of `APPLE_ID` / `APPLE_PASSWORD`, you can use an App Store Connect API key. This is more robust for automation but requires additional setup:

1. Go to [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Generate a new key with **Developer** access
3. Download the `.p8` key file (you can only download it once)
4. Note the **Key ID** and **Issuer ID**

Then set these secrets instead of APPLE_ID/APPLE_PASSWORD:
- `APPLE_API_ISSUER`: The Issuer ID
- `APPLE_API_KEY`: The Key ID
- `APPLE_API_KEY_PATH`: Base64-encoded contents of the .p8 file

The workflow currently uses APPLE_ID/APPLE_PASSWORD. To switch to API key authentication, you'd need to update the workflow to decode APPLE_API_KEY_PATH to a file and set its path.

## Troubleshooting

### "The signature is invalid" or "code object is not signed at all"

- Verify the certificate is a **Developer ID Application** certificate (not Development or Distribution)
- Check that both the certificate and private key were exported together
- Ensure the base64 encoding didn't include extra whitespace

### "Unable to upload your app for notarization"

- Verify your Apple ID and app-specific password are correct
- Check that your Apple Developer Program membership is active
- Ensure the Team ID matches the certificate's team

### Notarization takes a long time

Apple's notarization service usually completes within 5-15 minutes, but can take longer during high-traffic periods. The workflow will wait for completion.

### "The notary service is not available"

Retry the workflow. Apple's notarization service occasionally has downtime.

## Security Notes

- Never commit the `.p12` file or passwords to the repository
- The certificate base64 string and passwords should only exist in GitHub Secrets
- App-specific passwords can be revoked at any time from your Apple ID settings
- Consider rotating the app-specific password periodically
