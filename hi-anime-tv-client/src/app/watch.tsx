import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenFrame, palette } from '@/components/catalog-ui';

type Language = 'sub' | 'dub';

function param(value?: string | string[]): string {
  return typeof value === 'string' ? value : '';
}

export default function WatchScreen() {
  const params = useLocalSearchParams<{
    url?: string | string[];
    alternateUrl?: string | string[];
    language?: string | string[];
    alternateLanguage?: string | string[];
    title?: string | string[];
    episode?: string | string[];
  }>();
  const primaryUrl = param(params.url);
  const alternateUrl = param(params.alternateUrl);
  const primaryLanguage: Language = param(params.language) === 'dub' ? 'dub' : 'sub';
  const alternateLanguage: Language =
    param(params.alternateLanguage) === 'sub' ? 'sub' : 'dub';
  const [language, setLanguage] = useState(primaryLanguage);
  const [pageError, setPageError] = useState('');
  const sourceUrl = language === primaryLanguage ? primaryUrl : alternateUrl;
  const safeSourceUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : '';
  const title = param(params.title) || 'Now playing';
  const episode = param(params.episode);

  return (
    <ScreenFrame>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ focused }) => [styles.backButton, focused && styles.focused]}
        >
          <Text style={styles.buttonText}>←  Back</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>
            {episode ? `Episode ${episode}  ·  ` : ''}
            {language === 'sub' ? 'Japanese · Subtitles' : 'English · Dub'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${alternateLanguage === 'sub' ? 'subtitles' : 'English dub'}`}
          disabled={!alternateUrl}
          onPress={() => {
            setPageError('');
            setLanguage(language === primaryLanguage ? alternateLanguage : primaryLanguage);
          }}
          style={({ focused }) => [
            styles.languageButton,
            focused && styles.focused,
            !alternateUrl && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            Switch to {alternateLanguage === 'sub' ? 'SUB' : 'DUB'}
          </Text>
        </Pressable>
      </View>
      {safeSourceUrl && !pageError ? (
        <WebView
          key={safeSourceUrl}
          source={{ uri: safeSourceUrl }}
          style={styles.player}
          originWhitelist={['http://*', 'https://*']}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={palette.accent} />
              <Text style={styles.loadingText}>Opening embedded player…</Text>
            </View>
          )}
          onError={(event) => {
            setPageError(
              event.nativeEvent.description || 'The embedded player could not be opened.',
            );
          }}
        />
      ) : (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>
            {pageError ? 'Player unavailable' : 'No stream for this version'}
          </Text>
          <Text style={styles.errorMessage}>
            {pageError || 'There is no playable embed URL for the selected language.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ focused }) => [styles.backButton, focused && styles.focused]}
          >
            <Text style={styles.buttonText}>Return to episodes</Text>
          </Pressable>
        </View>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 28,
    backgroundColor: '#0E1016',
  },
  backButton: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 7, backgroundColor: '#242731' },
  titleBlock: { flex: 1 },
  title: { color: palette.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: palette.muted, fontSize: 12, marginTop: 4 },
  languageButton: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 7, backgroundColor: palette.accent },
  buttonText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  focused: { borderWidth: 2, borderColor: '#FFFFFF' },
  disabled: { opacity: 0.4 },
  player: { flex: 1, backgroundColor: '#000000' },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#000000',
  },
  loadingText: { color: palette.text, fontSize: 15 },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  errorTitle: { color: palette.text, fontSize: 22, fontWeight: '900' },
  errorMessage: { maxWidth: 520, color: palette.muted, textAlign: 'center', fontSize: 15 },
});
