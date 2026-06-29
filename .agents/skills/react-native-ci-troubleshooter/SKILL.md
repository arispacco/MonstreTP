---
name: react-native-ci-troubleshooter
description: >-
  Prevents, checks, and diagnoses common React Native CI/CD build errors under Android (such as font linking, package mismatches, XML syntax in manifests, and artifact uploads).
---

# React Native CI/CD Troubleshooter

## Overview
This skill provides guidelines and validation steps for coding agents to prevent recurring GitHub Actions and Gradle build failures on React Native Android projects. Use this skill when modifying build configurations, adding dependencies, updating `AndroidManifest.xml`, or troubleshooting failed CI runs.

## Checklist for Modifying Dependencies
When adding packages with native dependencies, verify:
- **Autolinking compatibility**: React Native 0.79+ or 0.86+ may have issues autolinking older packages (e.g., deprecated `react-native-document-picker` must be migrated to `@react-native-documents/picker`).
- **Nitro Modules / Native Overheads**: Avoid packages that pull in deprecated/unsupported native build wrappers unless explicitly requested (e.g. `react-native-audio-recorder-player` version `^4.5.0` fails without Nitro modules configuration; use `3.6.14`).
- **Synchronized Lockfiles**: If a change is made to `package.json`, immediately run `npm install` locally to update `package-lock.json`. The CI runs `npm ci`, which will fail if the lockfile is outdated.

## Checklist for `AndroidManifest.xml`
- **XML Namespace Declarations**: If you add any attribute utilizing the `tools:` namespace (e.g., `tools:ignore="ScopedStorage"` or `tools:node="replace"`), you **must** declare the tools namespace in the root `<manifest>` tag:
  ```xml
  <manifest xmlns:android="http://schemas.android.com/apk/res/android"
            xmlns:tools="http://schemas.github.com/tools"
            xmlns:tools="http://schemas.android.com/tools">
  ```

## Checklist for Assets & Vector Icons
- **Gradle Linkage**: React Native Vector Icons needs explicit font asset copying. Ensure `android/app/build.gradle` contains:
  ```groovy
  apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
  ```
- **Asset Declaration**: Register Fonts in `react-native.config.js` to ensure they bundle during release builds:
  ```javascript
  module.exports = {
    assets: ['./node_modules/react-native-vector-icons/Fonts'],
  };
  ```

## Checklist for GitHub Actions Workflow Configurations
- **Wildcard Artifact Paths**: Do not hardcode the release APK filename in the upload step (e.g., `app-release-unsigned.apk`). Instead, use a wildcard matching pattern so changes to compilation sign-states do not crash the runner:
  ```yaml
  - name: Upload Release APK
    uses: actions/upload-artifact@v4
    with:
      name: app-release
      path: android/app/build/outputs/apk/release/*.apk
  ```

## Troubleshooting a CI Build Failure
1. If the job fails on **Build Release APK**, retrieve the failure logs using `fetch-failed-ci-step`.
2. Inspect if the error is related to a missing import. Remember to add navigation requirements like `@react-navigation/native-stack` or `react-native-screens` to `package.json` if they are imported in the code.
3. If it fails on the **Upload** step, verify that the artifact file exists in the directory.
