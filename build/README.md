# Build Resources

This directory contains resources needed for building the macOS application.

## App Icon

To add a custom app icon:

1. Create a 1024x1024 PNG image
2. Convert to `.icns` format using:
   - Online: https://cloudconvert.com/png-to-icns
   - Or macOS `iconutil` command
3. Save as `icon.icns` in this directory

Without a custom icon, Electron will use the default icon.

## Entitlements

The `entitlements.mac.plist` file contains macOS security entitlements:
- JIT compilation support
- Network client access (for Supabase)
- Required for hardened runtime

Do not modify unless you know what you're doing.
