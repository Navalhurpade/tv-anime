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
WebView. Those links are embedded player pages, not direct video-file URLs.
The WebView dependency is native, so use an Android TV/Apple TV development
build rather than Expo Go to test playback.

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
yarn prebuild:tv # Executes clean Expo prebuild with TV modifications
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
> Setting the environment variable `EXPO_TV=1` enables the `@react-native-tvos/config-tv` plugin to modify the project for TV.
> This can also be done by setting the parameter `isTV` to true in the `app.json`.

## Development

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

This project includes a [demo](./src/components/tv-event-demo.tsx) showing how to use React Native TV APIs to highlight controls as the user navigates the screen with the remote control.

## Deploy

Deploy on all platforms with Expo Application Services (EAS).

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
