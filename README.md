# VoxNote AI (Capacitor + React + Android)

This repository already contains a Capacitor Android project (`/android`) wired to the React app (`/src`).

## What is now configured

- Android package/application ID set to `com.voxnote.ai`.
- App display name set to `VoxNote AI`.
- Release version bumped to `versionCode 2`, `versionName 1.0.1`.
- Safe-area handling added for top/bottom in-app layout for modern Android devices.

## Run on Android Studio

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build web assets and sync Android:
   ```bash
   npm run cap:sync
   ```
3. Open Android Studio:
   ```bash
   npm run android:open
   ```
4. In Android Studio:
   - Wait for Gradle sync.
   - Select a device/emulator.
   - Click **Run**.

## Build Play Store artifacts

From repo root:

- Generate release **AAB** (Play Store upload):
  ```bash
  npm run android:bundle:release
  ```
  Output: `android/app/build/outputs/bundle/release/app-release.aab`

- Generate release **APK** (direct install/testing):
  ```bash
  npm run android:apk:release
  ```
  Output: `android/app/build/outputs/apk/release/app-release.apk`

## Install directly to your phone

With USB debugging enabled:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Play Store checklist before publishing

- Replace signing config with your production keystore in Android Studio.
- Verify Privacy Policy URL and in-app policy copy.
- Add final app screenshots, store listing copy, and content rating.
- Run full QA on a physical device (recording permissions, background behavior, exports, and share flows).
