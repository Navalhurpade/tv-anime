import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  DEFAULT_API_BASE_URL,
  getApiBaseUrl,
  getHome,
  normalizeApiBaseUrl,
  saveApiBaseUrl,
} from '@/api/anime';
import {
  ActionButton,
  ScreenFrame,
  TopBar,
  palette,
} from '@/components/catalog-ui';

type Feedback = {
  kind: 'success' | 'error';
  message: string;
};

export default function SettingsScreen() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    getApiBaseUrl()
      .then((savedUrl) => {
        if (active) setBaseUrl(savedUrl);
      })
      .catch((cause: unknown) => {
        if (active) {
          setFeedback({
            kind: 'error',
            message:
              cause instanceof Error
                ? cause.message
                : 'Could not load the saved API address.',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const save = async (value = baseUrl) => {
    setWorking(true);
    setFeedback(null);
    try {
      const savedUrl = await saveApiBaseUrl(value);
      setBaseUrl(savedUrl);
      setFeedback({ kind: 'success', message: 'API address saved on this device.' });
    } catch (cause) {
      setFeedback({
        kind: 'error',
        message:
          cause instanceof Error ? cause.message : 'Could not save this API address.',
      });
    } finally {
      setWorking(false);
    }
  };

  const testConnection = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      const normalizedUrl = normalizeApiBaseUrl(baseUrl);
      await getHome(normalizedUrl);
      setFeedback({
        kind: 'success',
        message: `Connected successfully to ${normalizedUrl}.`,
      });
    } catch (cause) {
      setFeedback({
        kind: 'error',
        message:
          cause instanceof Error
            ? cause.message
            : 'Could not connect to this API address.',
      });
    } finally {
      setWorking(false);
    }
  };

  const restoreDefault = async () => {
    setBaseUrl(DEFAULT_API_BASE_URL);
    await save(DEFAULT_API_BASE_URL);
  };

  return (
    <ScreenFrame>
      <TopBar active="settings" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PERSONALIZE YOUR APP</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Keep your TV experience connected to the API you want to use.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View style={styles.iconTile}>
              <Text style={styles.iconText}>⌘</Text>
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>API connection</Text>
              <Text style={styles.cardSubtitle}>
                Change where HiAnime loads its catalogue and episodes.
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>API base URL</Text>
          <TextInput
            accessibilityLabel="API base URL"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !working}
            keyboardType="url"
            onBlur={() => setFocused(false)}
            onChangeText={(value) => {
              setBaseUrl(value);
              setFeedback(null);
            }}
            onFocus={() => setFocused(true)}
            onSubmitEditing={() => void save()}
            placeholder="https://animehot.cc/api"
            placeholderTextColor="#737D8A"
            returnKeyType="done"
            spellCheck={false}
            style={[styles.input, focused && styles.inputFocused]}
            value={baseUrl}
          />
          <Text style={styles.helpText}>
            Enter your server address. If you leave off <Text style={styles.inlineCode}>/api</Text>,
            it will be added automatically. Use the complete address including
            <Text style={styles.inlineCode}> https://</Text>.
          </Text>

          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.feedback,
                feedback.kind === 'error'
                  ? styles.feedbackError
                  : styles.feedbackSuccess,
              ]}
            >
              <View
                style={[
                  styles.feedbackDot,
                  feedback.kind === 'error'
                    ? styles.feedbackDotError
                    : styles.feedbackDotSuccess,
                ]}
              />
              <Text
                style={[
                  styles.feedbackText,
                  feedback.kind === 'error'
                    ? styles.feedbackTextError
                    : styles.feedbackTextSuccess,
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              title={working ? 'Please wait…' : 'Save address'}
              primary
              disabled={working || loading}
              onPress={() => void save()}
            />
            <ActionButton
              title="Test connection"
              disabled={working || loading}
              onPress={() => void testConnection()}
            />
            <Pressable
              accessibilityRole="button"
              disabled={working || loading}
              onPress={() => void restoreDefault()}
              style={({ focused: isFocused }) => [
                styles.resetButton,
                isFocused && styles.resetButtonFocused,
                (working || loading) && styles.resetButtonDisabled,
              ]}
            >
              <Text style={styles.resetText}>Restore default</Text>
            </Pressable>
            {working ? (
              <ActivityIndicator color={palette.accent} style={styles.spinner} />
            ) : null}
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>A note about custom servers</Text>
          <Text style={styles.noteText}>
            The server should provide the same HiAnime API routes used by this
            app, including home, search, anime details, and episodes. Your
            address is saved only on this device.
          </Text>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: '6%',
    paddingTop: 38,
    paddingBottom: 52,
  },
  heading: { marginBottom: 28 },
  eyebrow: {
    color: palette.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: { color: palette.text, fontSize: 38, fontWeight: '800', marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 16, marginTop: 8 },
  card: {
    padding: 28,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 27 },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#292239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: palette.accentSoft, fontSize: 24, fontWeight: '700' },
  cardTitleBlock: { flex: 1, gap: 4 },
  cardTitle: { color: palette.text, fontSize: 19, fontWeight: '800' },
  cardSubtitle: { color: palette.muted, fontSize: 14 },
  fieldLabel: { color: '#DDE1E7', fontSize: 14, fontWeight: '700', marginBottom: 9 },
  input: {
    height: 58,
    paddingHorizontal: 17,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343B47',
    backgroundColor: '#0C1017',
    color: palette.text,
    fontSize: 17,
  },
  inputFocused: { borderWidth: 2, borderColor: palette.accentSoft },
  helpText: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  inlineCode: { color: palette.accentSoft, fontWeight: '700' },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 10,
    marginTop: 20,
  },
  feedbackSuccess: { backgroundColor: '#14251F' },
  feedbackError: { backgroundColor: '#2A1A20' },
  feedbackDot: { width: 8, height: 8, borderRadius: 4 },
  feedbackDotSuccess: { backgroundColor: palette.mint },
  feedbackDotError: { backgroundColor: '#FF8B99' },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 19 },
  feedbackTextSuccess: { color: palette.mint },
  feedbackTextError: { color: '#FFABB3' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  resetButton: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 24 },
  resetButtonFocused: { backgroundColor: palette.surfaceRaised, borderWidth: 2, borderColor: '#FFFFFF' },
  resetButtonDisabled: { opacity: 0.45 },
  resetText: { color: '#C4B5FD', fontSize: 14, fontWeight: '700' },
  spinner: { marginHorizontal: 4 },
  note: { paddingHorizontal: 5, paddingTop: 26 },
  noteTitle: { color: palette.text, fontSize: 14, fontWeight: '700' },
  noteText: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 7 },
});
