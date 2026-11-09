import { Href, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  findNodeHandle,
  type LayoutChangeEvent,
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
import { TVFocusGuideView } from '@/components/tv-focus-guide';

const CURSOR_SIZE = 14;
const CURSOR_RING = 34;

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
  const [playerSize, setPlayerSize] = useState({ width: 0, height: 0 });
  const [cursorHint, setCursorHint] = useState('');
  const webViewRef = useRef<WebView | null>(null);
  const attemptedSources = useRef(new Set<string>());
  const overlayRef = useRef<View | null>(null);
  const [overlayTag, setOverlayTag] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      webViewRef.current = null;
    };
  }, []);

  // --- Cursor driven by Animated values (native driver → no re-render on move).
  // The raw X/Y are kept in refs so handlers can read them without stale
  // closures. Animated.Values drive the visual transform smoothly.
  const cursorX = useRef(new Animated.Value(0)).current;
  const cursorY = useRef(new Animated.Value(0)).current;
  const cursorPos = useRef({ x: 0, y: 0 });
  // Per-direction acceleration state. Each direction tracks the timestamp of
  // the last press so holds ramp up quickly and taps stay precise.
  const repeatInfo = useRef<Record<string, { count: number; last: number }>>({
    up: { count: 0, last: 0 },
    down: { count: 0, last: 0 },
    left: { count: 0, last: 0 },
    right: { count: 0, last: 0 },
  });

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    setChromeActivity((activity) => activity + 1);
  }, []);

  // Last time we pushed a synthetic mouse-hover into the WebView; throttled
  // so we don't flood the bridge during rapid movement.
  const lastHoverSent = useRef(0);

  // Fire synthetic mouse/pointer "move" events into the embedded page at the
  // current cursor position. Most video embeds hide their control bar after
  // inactivity and only re-show it on real mouse movement, so without this
  // our RN cursor can click precisely but the player's gear/quality/
  // fullscreen icons never appear.
  const hoverAtCursor = useCallback(
    (force = false) => {
      const webView = webViewRef.current;
      if (!webView) return;
      const now = Date.now();
      if (!force && now - lastHoverSent.current < 60) return;
      lastHoverSent.current = now;
      const x = Math.round(cursorPos.current.x);
      const y = Math.round(cursorPos.current.y);
      const js = `(function(){try{
        var x=${x | 0},y=${y | 0};
        var el=document.elementFromPoint(x,y);
        if(!el) return;
        var opts={bubbles:true,cancelable:true,composed:true,view:window,
          clientX:x,clientY:y,screenX:x,screenY:y,
          button:0,buttons:0,pointerType:'mouse',isPrimary:true,pointerId:1};
        try{ el.dispatchEvent(new PointerEvent('pointermove',opts)); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mousemove',opts)); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mouseover',opts)); }catch(_){}
        try{ el.dispatchEvent(new PointerEvent('pointerover',opts)); }catch(_){}
        // Many HTML5 players listen on document/window, not the element.
        try{ document.dispatchEvent(new MouseEvent('mousemove',opts)); }catch(_){}
      }catch(_){}})(); true;`;
      webView.injectJavaScript(js);
    },
    [],
  );

  const setCursorPos = useCallback(
    (x: number, y: number, animated = true) => {
      const w = playerSize.width || 1280;
      const h = playerSize.height || 720;
      const nx = Math.max(0, Math.min(w - 1, x));
      const ny = Math.max(0, Math.min(h - 1, y));
      cursorPos.current.x = nx;
      cursorPos.current.y = ny;
      if (animated) {
        Animated.parallel([
          Animated.timing(cursorX, {
            toValue: nx,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(cursorY, {
            toValue: ny,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        cursorX.setValue(nx);
        cursorY.setValue(ny);
      }
      // Wake up the player's auto-hide controls.
      hoverAtCursor();
    },
    [playerSize.width, playerSize.height, cursorX, cursorY, hoverAtCursor],
  );

  const moveCursor = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const w = playerSize.width || 1280;
      const now = Date.now();
      const info = repeatInfo.current[direction];
      // Reset the ramp for every other direction so a quick turn is precise.
      Object.keys(repeatInfo.current).forEach((d) => {
        if (d !== direction) repeatInfo.current[d] = { count: 0, last: 0 };
      });
      // Within 260 ms of the previous press? That's a hold → accelerate.
      if (now - info.last < 260) {
        info.count = Math.min(info.count + 1, 30);
      } else {
        info.count = 0;
      }
      info.last = now;
      // Base = 1.5 % of width (≈ 14 px at 960 w), max multiplier 6×.
      const base = Math.max(14, Math.round(w * 0.015));
      const multiplier = 1 + Math.min(info.count, 25) * 0.22;
      const step = Math.round(base * multiplier);
      const dx = direction === 'left' ? -step : direction === 'right' ? step : 0;
      const dy = direction === 'up' ? -step : direction === 'down' ? step : 0;
      setCursorPos(cursorPos.current.x + dx, cursorPos.current.y + dy);
    },
    [playerSize.width, setCursorPos],
  );

  const clickAtCursor = useCallback(() => {
    const webView = webViewRef.current;
    if (!webView) return;
    const x = Math.round(cursorPos.current.x);
    const y = Math.round(cursorPos.current.y);
    const js = `(function(){try{
      var x=${x|0},y=${y|0};
      var el=document.elementFromPoint(x,y);
      var tag=el?(el.tagName||'').toLowerCase():'none';
      var inIframe=tag==='iframe';
      if(el){
        try{ if(el.focus) el.focus({preventScroll:true}); }catch(_){}
        var opts={bubbles:true,cancelable:true,composed:true,view:window,clientX:x,clientY:y,screenX:x,screenY:y,button:0,buttons:1,pointerType:'mouse',isPrimary:true,pointerId:1};
        try{ el.dispatchEvent(new PointerEvent('pointerover',opts)); }catch(_){}
        try{ el.dispatchEvent(new PointerEvent('pointerenter',opts)); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mouseover',opts)); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mousemove',opts)); }catch(_){}
        try{ el.dispatchEvent(new PointerEvent('pointerdown',opts)); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mousedown',opts)); }catch(_){}
        try{ el.dispatchEvent(new PointerEvent('pointerup',Object.assign({},opts,{buttons:0}))); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('mouseup',Object.assign({},opts,{buttons:0}))); }catch(_){}
        try{ el.dispatchEvent(new MouseEvent('click',Object.assign({},opts,{buttons:0}))); }catch(_){}
        try{ if(typeof el.click==='function') el.click(); }catch(_){}
      }
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'cursor-click',tag:tag,inIframe:inIframe}));
    }catch(e){
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'cursor-click-error',message:String(e)}));
    } })(); true;`;
    webView.injectJavaScript(js);
  }, []);

  // Hold-to-repeat state. Android TV's useTVEventHandler only emits ONE
  // event per long-press (longXxx action=0 at hold-start, action=1 at
  // hold-end). To get continuous cursor motion while a direction is held,
  // we start an interval on the "begin" event and clear it on the "end".
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDirectionRef = useRef<'up' | 'down' | 'left' | 'right' | null>(
    null,
  );

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current != null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdDirectionRef.current = null;
  }, []);

  const startHold = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      stopHold();
      holdDirectionRef.current = direction;
      // Fire immediately so hold is responsive, then every 55ms for ~18 Hz
      // cursor updates — the Animated.timing will blend them smoothly.
      moveCursor(direction);
      holdIntervalRef.current = setInterval(() => {
        if (holdDirectionRef.current) moveCursor(holdDirectionRef.current);
      }, 55);
    },
    [moveCursor, stopHold],
  );

  // Make sure any dangling hold interval is cleared when pointer mode exits
  // or on unmount.
  useEffect(() => {
    if (!interactionMode) stopHold();
  }, [interactionMode, stopHold]);
  useEffect(() => () => stopHold(), [stopHold]);

  const handleTVEvent = useCallback(
    (event: HWEvent) => {
      const actionRaw = (event as unknown as { eventKeyAction?: unknown })
        .eventKeyAction;

      if (
        event.eventType === 'focus' ||
        event.eventType === 'blur' ||
        event.eventType === 'pan'
      ) {
        return;
      }

      if (!interactionMode) {
        revealChrome();
        return;
      }

      // On this RN-tvos build (Android TV):
      //   action === 1  →  short press (single discrete event).
      //   action === 0  →  long-press "begin" (longXxx event, no repeats).
      //   action === 1  →  long-press "end"   (longXxx event).
      // So a held D-pad arrow only gives us one longXxx/0 then one longXxx/1
      // with nothing in between. We drive continuous motion ourselves via a
      // repeat interval that starts on "begin" and stops on "end".
      switch (event.eventType) {
        case 'up':
          moveCursor('up');
          return;
        case 'down':
          moveCursor('down');
          return;
        case 'left':
          moveCursor('left');
          return;
        case 'right':
          moveCursor('right');
          return;
        case 'swipeUp':
          moveCursor('up');
          return;
        case 'swipeDown':
          moveCursor('down');
          return;
        case 'swipeLeft':
          moveCursor('left');
          return;
        case 'swipeRight':
          moveCursor('right');
          return;
        case 'longUp':
          if (actionRaw === 0) startHold('up');
          else stopHold();
          return;
        case 'longDown':
          if (actionRaw === 0) startHold('down');
          else stopHold();
          return;
        case 'longLeft':
          if (actionRaw === 0) startHold('left');
          else stopHold();
          return;
        case 'longRight':
          if (actionRaw === 0) startHold('right');
          else stopHold();
          return;
        case 'select':
        case 'playPause':
          clickAtCursor();
          return;
        case 'longSelect':
          // Only fire once, on hold-start.
          if (actionRaw === 0) clickAtCursor();
          return;
        default:
          return;
      }
    },
    [
      interactionMode,
      moveCursor,
      clickAtCursor,
      revealChrome,
      startHold,
      stopHold,
    ],
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
    if (interactionMode) {
      // Center the cursor when entering pointer mode. Instant (no animation)
      // so it does not slide in from a stale position.
      setCursorPos(
        Math.round((playerSize.width || 0) / 2),
        Math.round((playerSize.height || 0) / 2),
        false,
      );
      // Reset acceleration counters.
      (['up', 'down', 'left', 'right'] as const).forEach((d) => {
        repeatInfo.current[d] = { count: 0, last: 0 };
      });
      setCursorHint('');
      // Nudge the player into showing its control bar immediately.
      hoverAtCursor(true);
    }
    // Intentionally only runs when interactionMode flips on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!isMountedRef.current) return;
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
              accessibilityLabel="Enter pointer mode to move a cursor over the embedded page with the D-pad"
              disabled={!sourceUrl}
              onPress={() => setInteractionMode(true)}
              style={({ focused }) => [
                styles.interactionButton,
                focused && styles.focused,
                !sourceUrl && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>Pointer</Text>
            </Pressable>
          </View>
          {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        </>
      ) : null}
      {sourceUrl ? (
        <View
          style={styles.playerContainer}
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setPlayerSize({ width, height });
            // Clamp / recenter cursor to the new bounds.
            const curX = cursorPos.current.x;
            const curY = cursorPos.current.y;
            if (curX === 0 && curY === 0) {
              setCursorPos(Math.round(width / 2), Math.round(height / 2), false);
            } else {
              setCursorPos(curX, curY, false);
            }
          }}
        >
          <WebView<unknown>
            ref={webViewRef}
            key={`${sourceUrl}:${reloadToken}`}
            source={{ uri: sourceUrl }}
            style={styles.player}
            // Keep the native WebView out of the TV focus graph so the native
            // video player never captures the D-pad. In pointer mode we drive
            // the cursor from JS and dispatch synthetic clicks via
            // injectJavaScript.
            focusable={false}
            originWhitelist={['http://*', 'https://*']}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onLoadStart={() => {
              if (isMountedRef.current) setLoading(true);
            }}
            onLoad={() => {
              if (isMountedRef.current) setLoading(false);
            }}
            onLoadEnd={() => {
              if (isMountedRef.current) setLoading(false);
            }}
            onMessage={(event) => {
              if (!isMountedRef.current) return;
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data && data.type === 'cursor-click') {
                  if (data.inIframe) {
                    setCursorHint(
                      'This control lives inside a cross-origin frame; the tap may not register. Try another mirror if it does not respond.',
                    );
                  } else if (data.tag && data.tag !== 'none') {
                    setCursorHint(`Tapped <${data.tag}>`);
                  }
                }
              } catch {
                /* ignore */
              }
            }}
            onError={() => {
              if (isMountedRef.current) handlePlayerError(sourceUrl);
            }}
          />
          {interactionMode ? (
            <>
              {/*
                Pointer-mode input layer.

                - The Pressable covers the whole player and holds TV focus.
                  Because it's focused, Android TV routes D-pad events to its
                  own key dispatcher first (where RN forwards them to
                  useTVEventHandler) instead of to the native video view
                  underneath. That stops the player from grabbing left/right
                  for seek and up/down for volume.

                - nextFocus* set to the overlay's own node tag traps focus so
                  the focus-finder can't wander onto the WebView if a key
                  isn't otherwise consumed. We also wrap in TVFocusGuideView
                  with trapFocus* as belt-and-braces.

                - onPress is bound to clickAtCursor so the Select key always
                  fires a synthetic click at the cursor position; this is
                  also what prevents Select from being treated as a focus
                  escape by the TV focus engine.
              */}
              <TVFocusGuideView
                trapFocusUp
                trapFocusDown
                trapFocusLeft
                trapFocusRight
                style={styles.pointerInputOverlay}
              >
                <Pressable
                  ref={(instance) => {
                    overlayRef.current = instance as unknown as View | null;
                    const tag = instance
                      ? findNodeHandle(instance as unknown as View)
                      : null;
                    if (tag !== overlayTag) setOverlayTag(tag);
                  }}
                  accessibilityLabel="Pointer mode input surface"
                  hasTVPreferredFocus
                  focusable
                  collapsable={false}
                  onPress={clickAtCursor}
                  nextFocusUp={overlayTag ?? undefined}
                  nextFocusDown={overlayTag ?? undefined}
                  nextFocusLeft={overlayTag ?? undefined}
                  nextFocusRight={overlayTag ?? undefined}
                  nextFocusForward={overlayTag ?? undefined}
                  style={styles.pointerInputOverlay}
                />
              </TVFocusGuideView>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.cursorLayer,
                  {
                    transform: [
                      { translateX: cursorX },
                      { translateY: cursorY },
                    ],
                  },
                ]}
              >
                <View style={styles.cursorRing} />
                <View style={styles.cursorDot} />
              </Animated.View>
              <View pointerEvents="none" style={styles.interactionNotice}>
                <Text style={styles.interactionNoticeTitle}>POINTER MODE</Text>
                <Text style={styles.interactionNoticeText}>
                  D-pad moves the cursor. Select/Play taps. Back exits.
                </Text>
                {cursorHint ? (
                  <Text style={styles.interactionNoticeHint}>{cursorHint}</Text>
                ) : null}
              </View>
            </>
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
  interactionNoticeHint: {
    color: palette.mint,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  pointerInputOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  // Zero-size positioned origin. Dot and ring are centered via negative
  // margins so the Animated translate drives the cursor's *center* to
  // (cursorX, cursorY).
  cursorLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  cursorDot: {
    position: 'absolute',
    left: -CURSOR_SIZE / 2,
    top: -CURSOR_SIZE / 2,
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    borderRadius: CURSOR_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#101010',
    // Tiny glow so the cursor reads on bright video frames.
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 6,
  },
  cursorRing: {
    position: 'absolute',
    left: -CURSOR_RING / 2,
    top: -CURSOR_RING / 2,
    width: CURSOR_RING,
    height: CURSOR_RING,
    borderRadius: CURSOR_RING / 2,
    borderWidth: 2,
    borderColor: 'rgba(103,232,249,0.95)',
    backgroundColor: 'rgba(103,232,249,0.14)',
  },
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
