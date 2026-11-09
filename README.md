# Expo Router TV demo 👋

This app is a TV-first HiAnime catalog client built with Expo Router and
React Native TV. Home collections, title search, title details, episode
selection, subtitle/dub choice, and embedded playback are wired to the API
examples in [docs/hi-api-docus.md](./docs/hi-api-docus.md).

Use **Settings** in the top navigation to change the API base URL. Enter either
the server root (for example, `https://animehot.cc`) or an API URL ending in
`/api`; the app normalizes the address, lets you test it, and saves it on the
device for future sessions.

The playback screen opens the stream URL returned by the API in a native
WebView. It prefers Dub when available, supports switching between Sub and
Dub, lets you choose among the API's returned mirrors, and tries another mirror
when the embedded page reports a load error. A remote-friendly manual next
episode action is available when the API reports the episode range.

During playback, the app header hides after five seconds of inactivity and
reappears when the remote is used. Back first reveals a hidden header; press
Back again to leave playback. Choose **Pointer** in the header to enter
pointer mode: an on-screen cursor appears over the embedded page, the D-pad
moves it (hold a direction to accelerate), and Select / Play-Pause taps at the
cursor position. Back exits pointer mode. Taps are synthesized via
`injectJavaScript` as `pointer`/`mouse`/`click` events dispatched at
`document.elementFromPoint`. Because browsers block synthetic events from
crossing origin boundaries, a tap over a cross-origin iframe (for example a
hCaptcha / Cloudflare Turnstile / reCAPTCHA challenge hosted on a different
domain) may be ignored; the overlay surfaces a hint when that happens. In
those cases try another available mirror or return to the episode list.
CAPTCHA challenges are not solved or bypassed by the app, and ads remain part
of the provider page — only tap controls you recognize.

The Home screen also keeps a local **Continue watching** entry for the latest
episode opened, including its selected Sub/Dub version. Resume requests fresh
episode links from the API rather than persisting embed URLs. The embed does not
expose playback position, so continuing starts that episode from the beginning.
Use **Remove** on the shelf to clear the saved entry from the device.

Those links are embedded player pages, not direct video-file URLs. The app
cannot reliably control a provider's video quality, captions, or detect errors
that happen inside its player. Native playback with app-controlled quality and
captions requires an authorized API response containing direct HLS/DASH media
URLs and track/rendition metadata; this project intentionally does not extract
streams from third-party embed pages. The WebView dependency is native, so use
an Android TV/Apple TV development build rather than Expo Go to test playback.

This is an Expo project that can be built for Apple TV and Android TV targets, and also supports mobile and web platforms.

In addition to Expo SDK packages, this project uses

- the [React Native TV fork](https://github.com/react-native-tvos/react-native-tvos), which supports both phone (Android and iOS) and TV (Android TV and Apple TV) targets
- the [React Native TV config plugin](https://github.com/react-native-tvos/config-tv/tree/main/packages/config-tv) to allow Expo prebuild to modify the project's native files for TV builds

The application code is based on the [revamped default project template](https://expo.dev/changelog/sdk-55-beta#revamped-default-project-template) introduced in SDK 55, with modifications and additions to support multiplatform development, including TV.

## 🚀 How to use

#### Creating a new project

- Create a project: `npx create-expo-app -e with-router-tv`
- `cd` into the project

- For TV development:

```sh
yarn
npm run prebuild:tv # Executes clean Expo prebuild with TV modifications (Windows/macOS/Linux)
yarn ios # Build and run for Apple TV
yarn android # Build for Android TV
```
- For mobile development:

```sh
yarn
yarn prebuild # Executes Expo prebuild with no TV modifications
yarn ios # Build and run for iOS
yarn android # Build for Android mobile
```

- For web development:

```sh
yarn web # Run the project on web from localhost
```

> **_NOTE:_**
> The `prebuild:tv` script sets `EXPO_TV=1` for the prebuild command, including on Windows.
> The Android TV banner and icon are configured in `app.json`.

## Development

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

This project includes a [demo](./src/components/tv-event-demo.tsx) showing how to use React Native TV APIs to highlight controls as the user navigates the screen with the remote control.

## Deploy

Deploy on all platforms with Expo Application Services (EAS).

- Build an Android TV APK: `npm run build:apk` — EAS uploads the build and
  provides a link to download the APK when it completes.
- Deploy the website: `npx eas-cli deploy` — [Learn more](https://docs.expo.dev/eas/hosting/get-started/)
- Deploy on iOS and Android using: `npx eas-cli build` — [Learn more](https://expo.dev/eas)

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/learn): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
