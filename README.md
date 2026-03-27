# React Native Clash TCP Ping

This project is now a React Native CLI app with native folders included.

It can:

- download a Clash YAML config
- parse the `proxies` list
- run a TCP connect test for each proxy
- show success, failure, and latency

## Main Files

- `App.tsx`: UI and actions
- `src/clash.ts`: config download and YAML parsing
- `src/tcpPing.ts`: TCP testing and concurrency limiting
- `android/`: Android native project
- `ios/`: iOS native project

## Install

```bash
npm install
```

## Run

```bash
npm run start
npm run android
```

or:

```bash
npm run ios
```

## Android Permission

Make sure [AndroidManifest.xml](D:\Devcode\react_test\react_server_test\android\app\src\main\AndroidManifest.xml) includes:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Notes

- This is TCP connect latency, not ICMP ping.
- Some Clash subscriptions are not standard YAML and may need custom parsing.
- If the subscription returns base64 or requires auth headers, update `fetchClashConfigText`.
- `react-native-tcp-socket` depends on native linking, so install dependencies before running.

## Cloud Build APK

This project now includes a GitHub Actions workflow at
[android-apk.yml](D:\Devcode\react_test\react_server_test\.github\workflows\android-apk.yml).

After pushing the project to GitHub, you can build an APK in the cloud:

1. Push the repository to GitHub.
2. Open the repository Actions tab.
3. Run `Build Android APK`, or push to `main` or `master`.
4. Download the generated artifact named `app-release-apk`.

### Optional release signing

If you add these GitHub Actions secrets, the workflow will produce a properly release-signed APK:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

If you do not add them, the workflow still builds an APK by falling back to the debug keystore.

### Create a keystore

You can create one later with:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
```

Then convert the keystore file to base64 and save it as the `ANDROID_KEYSTORE_BASE64` GitHub secret.
