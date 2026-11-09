/**
 * withLargeHeap — Expo config plugin.
 *
 * Adds `android:largeHeap="true"` and `android:hardwareAccelerated="true"`
 * to the Android <application> tag so the WebView-hosted player has enough
 * heap on 1–2 GB Android TV boxes and never falls back to software
 * rendering. Survives `expo prebuild --clean`.
 *
 * Usage (app.json → expo.plugins):
 *   ["./plugins/withLargeHeap"]
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.$ = app.$ || {};
    app.$['android:largeHeap'] = 'true';
    app.$['android:hardwareAccelerated'] = 'true';
    return cfg;
  });
};
