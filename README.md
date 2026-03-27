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

This repository is ready for cloud APK build integration, but the GitHub Actions workflow
file is not included in the pushed version yet because the current GitHub token does not have
permission to create workflow files.

You can add a workflow later after pushing the repository with a token that includes
the `workflow` permission.
