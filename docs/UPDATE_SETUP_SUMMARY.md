# Auto-Update System - Quick Reference

## Overview

The auto-update system has two modes:

1. **Development/Testing**: Uses GitHub Releases API (current implementation)
2. **Production**: Uses signed update bundles with Tauri updater plugin (requires setup)

## Current Status

✅ **Basic auto-update** - Working with GitHub Releases API fallback
⏳ **Production setup** - Requires code signing and update server configuration

## Documentation

- **[Auto-Update Setup](./AUTO_UPDATE_SETUP.md)** - Basic implementation guide
- **[Production Update Setup](./PRODUCTION_UPDATE_SETUP.md)** - Complete production setup with signing

## Quick Commands

```bash
# Generate signing keys (one-time)
npm run update:generate-keys

# Sign an update bundle manually
npm run update:sign path/to/bundle.tar.gz

# Generate update manifest manually
npm run update:manifest 1.2.0
```

## Setup Checklist

### For Development (Current)
- [x] Tauri updater plugin installed
- [x] Update notification UI implemented
- [x] GitHub Releases API fallback working

### For Production
- [ ] Generate signing keys (`npm run update:generate-keys`)
- [ ] Add public key to `src-tauri/tauri.conf.json`
- [ ] Set up Apple Developer certificate (optional but recommended)
- [ ] Configure GitHub Secrets (TAURI_PRIVATE_KEY, etc.)
- [ ] Use `release-with-updates.yml` workflow or update existing workflow
- [ ] Test with a release

## Files

- `src/utils/updater.ts` - Update checking logic
- `src/components/UpdateNotification.tsx` - UI component
- `scripts/generate-update-manifest.sh` - Manifest generator
- `scripts/sign-update.sh` - Update bundle signer
- `.github/workflows/release-with-updates.yml` - Automated release workflow

## Support

For issues or questions:
1. Check [Production Update Setup](./PRODUCTION_UPDATE_SETUP.md) troubleshooting section
2. Review Tauri updater documentation
3. Check GitHub Actions logs

