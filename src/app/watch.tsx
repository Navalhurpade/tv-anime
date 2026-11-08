import { Href, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type HWEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  Episode,
  getEpisodeStreamUrls,
  getEpisodes,
  saveLastWatched,
  StreamLanguage,
} from '@/api/anime';
import { ActionButton, ScreenFrame, palette } from '@/components/catalog-ui';

const useRemoteEventHandler: (handler: (event: HWEvent) => void) => void =
  Platform.isTV
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').useTVEventHandler
    : () => {};

type WatchParams = {
  streams?: string | string[];
  alternateStreams?: string | string[];
  url?: string | string[];
  alternateUrl?: string | string[];
  language?: string | string[];
  alternateLanguage?: string | string[];
  title?: string | string[];
  episode?: string | string[];
  episodeIndex?: string | string[];
  animeId?: string | string[];
  animeSlug?: string | string[];
  image?: string | string[];
  totalEpisodes?: string | string[];
};

type PlaybackRoute = {
  streams: string[];
  alternateStreams: string[];
  language: StreamLanguage;
  alternateLanguage: StreamLanguage;
  title: string;
  episode: string;
  episodeIndex: number;
  animeId: string;
  animeSlug: string;
  image: string;
  totalEpisodes: number;
};

function param(value?: string | string[]): string {
  return typeof value === 'string' ? value : '';
}

function parseStreams(value: string, fallback = ''): string[] {
  let candidates: unknown;
  try {
    candidates = value ? JSON.parse(value) : [];
  } catch {
    candidates = [];
  }

  const entries = Array.isArray(candidates)
    ? candidates
    : fallback
      ? [fallback]
      : [];
  return [
    ...new Set(
      entries.filter(
        (url): url is string =>
          typeof url === 'string' && /^https?:\/\/[^/\s?#]+/i.test(url),
      ),
    ),
  ];
}

function routeFromParams(params: WatchParams): PlaybackRoute {
  const language: StreamLanguage = param(params.language) === 'dub' ? 'dub' : 'sub';
  const alternateLanguage: StreamLanguage =
    param(params.alternateLanguage) === 'dub' ? 'dub' : 'sub';
  return {
    streams: parseStreams(param(params.streams), param(params.url)),
    alternateStreams: parseStreams(
      param(params.alternateStreams),
      param(params.alternateUrl),
    ),
    language,
    alternateLanguage,
    title: param(params.title) || 'Now playing',
    episode: param(params.episode),
    episodeIndex: Number(param(params.episodeIndex)) || 0,
    animeId: param(params.animeId),
    animeSlug: param(params.animeSlug),
    image: param(params.image),
    totalEpisodes: Number(param(params.totalEpisodes)) || 0,
  };
}

export default function WatchScreen() {
  const params = useLocalSearchParams<WatchParams>();
  const requested = useMemo(() => routeFromParams(params), [
    params.streams,
    params.alternateStreams,
    params.url,
    params.alternateUrl,
    params.language,
    params.alternateLanguage,
    params.title,
    params.episode,
    params.episodeIndex,
    params.animeId,
    params.animeSlug,
    params.image,
    params.totalEpisodes,
  ]);
  const [language, setLanguage] = useState(requested.language);
  const [mirrorIndex, setMirrorIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [mirrorChooserVisible, setMirrorChooserVisible] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextError, setNextError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [chromeVisible, setChromeVisible] = useState(true);
  const [interactionMode, setInteractionMode] = useState(false);
  const [chromeActivity, setChromeActivity] = useState(0);
  const webViewRef = useRef<WebView | null>(null);
  const attemptedSources = useRef(new Set<string>());

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    setChromeActivity((activity) => activity + 1);
  }, []);

  const handleTVEvent = useCallback(
    (event: HWEvent) => {
      if (
        event.eventType === 'focus' ||
        event.eventType === 'blur' ||
        event.eventType === 'pan'
      ) {
        return;
      }
      if (!interactionMode) revealChrome();
    },
    [interactionMode, revealChrome],
  );
  useRemoteEventHandler(handleTVEvent);

  useEffect(() => {
    if (!chromeVisible || loading || interactionMode) return;
    const timer = setTimeout(() => setChromeVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [chromeActivity, chromeVisible, interactionMode, loading]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (interactionMode) {
        setInteractionMode(false);
        revealChrome();
      } else if (!chromeVisible) {
        revealChrome();
      } else {
        router.back();
      }
      return true;
    });
    return () => subscription.remove();
  }, [chromeVisible, interactionMode, revealChrome]);

  useEffect(() => {
    if (interactionMode) webViewRef.current?.requestFocus();
  }, [interactionMode]);

  useEffect(() => {
    setLanguage(requested.language);
    setMirrorIndex(0);
    setReloadToken((token) => token + 1);
    setLoading(true);
    setChromeVisible(true);
    setInteractionMode(false);
    setRecoveryMessage('');
    setRecoveryVisible(false);
    setMirrorChooserVisible(false);
    setNextError('');
    setSaveError('');
    attemptedSources.current.clear();
    if (requested.streams.length && requested.animeSlug) {
      saveLastWatched({
        animeId: requested.animeId,
        animeSlug: requested.animeSlug,
        title: requested.title,
        image: requested.image,
        episode: requested.episode,
        episodeIndex: requested.episodeIndex,
        totalEpisodes: requested.totalEpisodes,
        language: requested.language,
      }).catch((cause: unknown) => {
        setSaveError(
          cause instanceof Error
            ? cause.message
            : 'Could not save this playback session.',
        );
      });
    }
  }, [requested]);

  const streams =
    language === requested.language
      ? requested.streams
      : requested.alternateStreams;
  const selectedLanguage =
    language === requested.language ? requested.language : requested.alternateLanguage;
  const sourceUrl = streams[mirrorIndex] ?? '';
  const canSwitchLanguage = requested.alternateStreams.length > 0;
  const hasNextEpisode =
    !!requested.animeId &&
    requested.episodeIndex > 0 &&
    requested.episodeIndex < requested.totalEpisodes;
  const title = requested.title;

  const switchLanguage = () => {
    const nextLanguage =
      language === requested.language
        ? requested.alternateLanguage
        : requested.language;
    const nextStreams =
      nextLanguage === requested.language
        ? requested.streams
        : requested.alternateStreams;
    if (requested.animeSlug && nextStreams.length) {
      saveLastWatched({
        animeId: requested.animeId,
        animeSlug: requested.animeSlug,
        title: requested.title,
        image: requested.image,
        episode: requested.episode,
        episodeIndex: requested.episodeIndex,
        totalEpisodes: requested.totalEpisodes,
        language: nextLanguage,
      }).catch((cause: unknown) => {
        setSaveError(
          cause instanceof Error
            ? cause.message
            : 'Could not save this playback session.',
        );
      });
    }
    attemptedSources.current.clear();
    setMirrorIndex(0);
    setReloadToken((token) => token + 1);
    setRecoveryVisible(false);
    setLanguage(nextLanguage);
  };

  const handlePlayerError = (url: string) => {
    if (!url || attemptedSources.current.has(url)) return;
    attemptedSources.current.add(url);
    const nextIndex = streams.findIndex(
      (candidate, index) =>
        index !== mirrorIndex && !attemptedSources.current.has(candidate),
    );
    if (nextIndex >= 0) {
      setMirrorIndex(nextIndex);
      setReloadToken((token) => token + 1);
      setLoading(true);
      setRecoveryMessage(
        `This stream did not open. Trying mirror ${nextIndex + 1} of ${streams.length}.`,
      );
    } else {
      setLoading(false);
      setRecoveryMessage(
        'We could not open this stream. Try another mirror or version, or return to the episode list.',
      );
    }
    setRecoveryVisible(true);
  };

  const chooseMirror = (index: number) => {
    attemptedSources.current.clear();
    setMirrorIndex(index);
    setReloadToken((token) => token + 1);
    setLoading(true);
    setRecoveryVisible(false);
  };

  const retryCurrentMirror = () => {
    attemptedSources.current.clear();
    setReloadToken((token) => token + 1);
    setLoading(true);
    setRecoveryVisible(false);
  };

  const playNextEpisode = async () => {
    if (!hasNextEpisode || nextLoading) return;
    setNextLoading(true);
    setNextError('');
    try {
      const results = await getEpisodes(
        requested.animeId,
        requested.episodeIndex + 1,
        requested.episodeIndex + 1,
      );
      const nextEpisode: Episode | undefined = results[0];
      if (!nextEpisode) {
        setNextError('The next episode is not available from the API.');
        return;
      }

      const nextLanguage =
        getEpisodeStreamUrls(nextEpisode, selectedLanguage).length > 0
          ? selectedLanguage
          : selectedLanguage === 'sub'
            ? 'dub'
            : 'sub';
      const nextStreams = getEpisodeStreamUrls(nextEpisode, nextLanguage);
      if (!nextStreams.length) {
        setNextError('The next episode has no playable embed for Sub or Dub.');
        return;
      }
      const alternateLanguage: StreamLanguage = nextLanguage === 'sub' ? 'dub' : 'sub';
      const query = new URLSearchParams({
        streams: JSON.stringify(nextStreams),
        alternateStreams: JSON.stringify(
          getEpisodeStreamUrls(nextEpisode, alternateLanguage),
        ),
        language: nextLanguage,
        alternateLanguage,
        title,
        episode: String(nextEpisode.episodeNumber ?? requested.episodeIndex + 1),
        episodeIndex: String(requested.episodeIndex + 1),
        animeId: requested.animeId,
        animeSlug: requested.animeSlug,
        image: requested.image,
        totalEpisodes: String(requested.totalEpisodes),
      });
      router.replace(`/watch?${query.toString()}` as Href);
    } catch (cause) {
      setNextError(
        cause instanceof Error ? cause.message : 'Unable to load the next episode.',
      );
    } finally {
      setNextLoading(false);
    }
  };

  return (
    <ScreenFrame>
      {chromeVisible && !interactionMode ? (
        <>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              hasTVPreferredFocus={Platform.isTV}
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
                {requested.episode ? `Episode ${requested.episode}  ·  ` : ''}
                {selectedLanguage === 'sub'
                  ? 'Japanese · Subtitles'
                  : 'English · Dub'}
                {streams.length > 1
                  ? `  ·  Mirror ${mirrorIndex + 1}/${streams.length}`
                  : ''}
              </Text>
            </View>
            {canSwitchLanguage ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${selectedLanguage === 'sub' ? 'English dub' : 'subtitles'}`}
                onPress={switchLanguage}
                style={({ focused }) => [
                  styles.languageButton,
                  focused && styles.focused,
                ]}
              >
                <Text style={styles.buttonText}>
                  Switch to {selectedLanguage === 'sub' ? 'DUB' : 'SUB'}
                </Text>
              </Pressable>
            ) : null}
            {hasNextEpisode ? (
              <Pressable
                accessibilityRole="button"
                disabled={nextLoading}
                onPress={playNextEpisode}
                style={({ focused }) => [
                  styles.nextButton,
                  focused && styles.focused,
                  nextLoading && styles.disabled,
                ]}
              >
                <Text style={styles.buttonText}>
                  {nextLoading ? 'Loading…' : 'Next episode  ›'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Interact with the embedded page using the remote"
              disabled={!sourceUrl}
              onPress={() => setInteractionMode(true)}
              style={({ focused }) => [
                styles.interactionButton,
                focused && styles.focused,
                !sourceUrl && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>Interact</Text>
            </Pressable>
          </View>
          {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        </>
      ) : null}
      {sourceUrl ? (
        <View style={styles.playerContainer}>
          <WebView<unknown>
            ref={webViewRef}
            key={`${sourceUrl}:${reloadToken}`}
            source={{ uri: sourceUrl }}
            style={styles.player}
            focusable
            hasTVPreferredFocus={Platform.isTV && interactionMode}
            originWhitelist={['http://*', 'https://*']}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onLoadEnd={() => {
              setLoading(false);
              if (interactionMode) webViewRef.current?.requestFocus();
            }}
            onError={() => handlePlayerError(sourceUrl)}
          />
          {interactionMode ? (
            <View pointerEvents="none" style={styles.interactionNotice}>
              <Text style={styles.interactionNoticeTitle}>PAGE INTERACTION</Text>
              <Text style={styles.interactionNoticeText}>
                Use the D-pad and Select to navigate the page. Press Back to resume playback.
              </Text>
            </View>
          ) : null}
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={palette.accentSoft} />
              <Text style={styles.loadingTitle}>Preparing your stream</Text>
              <Text style={styles.loadingText}>Connecting to the selected embed…</Text>
            </View>
          ) : null}
          {nextError ? (
            <View style={styles.nextError}>
              <Text style={styles.nextErrorText}>{nextError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setNextError('')}
                style={({ focused }) => [styles.dismissButton, focused && styles.focused]}
              >
                <Text style={styles.buttonText}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No stream for this version</Text>
          <Text style={styles.emptyText}>
            There is no playable embed URL for the selected language.
          </Text>
          <ActionButton title="Return to episodes" onPress={() => router.back()} />
        </View>
      )}
      <Modal
        visible={recoveryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecoveryVisible(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.recoveryCard}>
            <Text style={styles.modalEyebrow}>PLAYBACK RECOVERY</Text>
            <Text style={styles.recoveryTitle}>
              {streams.length > 1 && attemptedSources.current.size < streams.length
                ? 'Switching stream'
                : 'Stream needs attention'}
            </Text>
            <Text style={styles.recoveryText}>{recoveryMessage}</Text>
            <View style={styles.recoveryActions}>
              <ActionButton
                title="Continue watching"
                primary
                onPress={() => setRecoveryVisible(false)}
              />
              <ActionButton title="Retry this mirror" onPress={retryCurrentMirror} />
              <ActionButton
                title="Choose mirror"
                onPress={() => {
                  setRecoveryVisible(false);
                  setMirrorChooserVisible(true);
                }}
                disabled={streams.length < 2}
              />
              <ActionButton title="Return to episodes" onPress={() => router.back()} />
            </View>
          </View>
        </View>
      </Modal>
      <MirrorChooser
        visible={mirrorChooserVisible}
        streams={streams}
        selectedIndex={mirrorIndex}
        onClose={() => setMirrorChooserVisible(false)}
        onSelect={chooseMirror}
      />
    </ScreenFrame>
  );
}

function MirrorChooser({
  visible,
  streams,
  selectedIndex,
  onClose,
  onSelect,
}: {
  visible: boolean;
  streams: string[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.recoveryCard}>
          <Text style={styles.modalEyebrow}>AVAILABLE STREAMS</Text>
          <Text style={styles.recoveryTitle}>Choose a mirror</Text>
          <View style={styles.mirrorList}>
            {streams.map((url, index) => (
              <Pressable
                key={`${url}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedIndex === index }}
                onPress={() => onSelect(index)}
                style={({ focused }) => [
                  styles.mirrorRow,
                  selectedIndex === index && styles.mirrorSelected,
                  focused && styles.focused,
                ]}
              >
                <Text style={styles.mirrorName}>
                  {selectedIndex === index ? '●  ' : '○  '}Mirror {index + 1}
                </Text>
                <Text numberOfLines={1} style={styles.mirrorHost}>
                  {url.replace(/^https?:\/\//i, '').split('/')[0]}
                </Text>
              </Pressable>
            ))}
          </View>
          <ActionButton title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: '4%',
    backgroundColor: 'rgba(17,21,29,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#292E39',
  },
  backButton: {
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: '#202631',
  },
  titleBlock: { flex: 1, gap: 5 },
  saveError: {
    backgroundColor: '#382426',
    color: '#FFDAD6',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  title: { color: palette.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: palette.muted, fontSize: 12 },
  languageButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#302644',
  },
  nextButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#253A35',
  },
  interactionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#263447',
  },
  buttonText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  focused: { borderWidth: 2, borderColor: palette.accentSoft },
  disabled: { opacity: 0.45 },
  playerContainer: { flex: 1, backgroundColor: '#000000' },
  player: { flex: 1, backgroundColor: '#000000' },
  interactionNotice: {
    position: 'absolute',
    top: 16,
    left: 18,
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(17,21,29,0.96)',
    borderColor: '#343B48',
    borderWidth: 1,
    gap: 4,
  },
  interactionNoticeTitle: {
    color: palette.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  interactionNoticeText: { color: palette.text, fontSize: 13, lineHeight: 18 },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    backgroundColor: 'rgba(7,9,13,0.92)',
  },
  loadingTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  loadingText: { color: palette.muted, fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  emptyTitle: { color: palette.text, fontSize: 24, fontWeight: '800' },
  emptyText: { maxWidth: 520, color: palette.muted, textAlign: 'center', fontSize: 15 },
  nextError: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    bottom: 24,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#171C25',
    borderWidth: 1,
    borderColor: '#343B48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nextErrorText: { flex: 1, color: palette.text, fontSize: 14 },
  dismissButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: '#302644' },
  modalScrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(3,5,8,0.78)',
  },
  recoveryCard: {
    width: '70%',
    maxWidth: 680,
    padding: 28,
    borderRadius: 24,
    gap: 14,
    backgroundColor: '#141923',
    borderColor: 'rgba(213,198,255,0.25)',
    borderWidth: 1,
  },
  modalEyebrow: { color: palette.mint, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  recoveryTitle: { color: palette.text, fontSize: 25, fontWeight: '800' },
  recoveryText: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  recoveryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  mirrorList: { gap: 8, maxHeight: 300 },
  mirrorRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#1C222C',
    borderWidth: 1,
    borderColor: '#2A303C',
    justifyContent: 'center',
    gap: 4,
  },
  mirrorSelected: { borderColor: palette.mint, backgroundColor: '#1D2D2A' },
  mirrorName: { color: palette.text, fontSize: 14, fontWeight: '800' },
  mirrorHost: { color: palette.muted, fontSize: 11 },
});
