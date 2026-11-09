import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Anime, getAnimeSlug, getAnimeTitle } from '@/api/anime';

const colors = {
  // Warm near-black background with a slight blue bias.
  background: '#07080C',
  surface: '#10131B',
  surfaceRaised: '#171B26',
  surfaceGlass: 'rgba(23,27,38,0.72)',
  text: '#F6F7FA',
  muted: '#8B94A3',
  mutedSoft: '#B4BBC7',
  // New gradient accent: electric cyan → violet.
  accent: '#A78BFA', // violet
  accentSoft: '#C4B5FD', // light violet (keeps existing key alive)
  accentCyan: '#67E8F9',
  accentWarm: '#FBBF24', // amber for "watch" moments
  mint: '#5EEAD4', // slightly brighter teal (keeps existing key alive)
  line: '#242A36',
  lineSoft: '#1C222D',
  danger: '#FB7185',
  shadow: '#000000',
};

// Reusable gradient stops.
const GRADIENT_ACCENT = ['#67E8F9', '#A78BFA'] as const;
const GRADIENT_ACCENT_SOFT = ['rgba(103,232,249,0.22)', 'rgba(167,139,250,0.22)'] as const;
const GRADIENT_WARM = ['#FBBF24', '#F97316'] as const;

// Rail/card geometry — kept outside the StyleSheet so the snap interval
// and the card styles always stay in sync.
const CARD_WIDTH = 184;
const CARD_GAP = 20;

export function animeDetailsHref(slug: string): Href {
  return `/anime/${encodeURIComponent(slug)}` as Href;
}

export function ScreenFrame({ children }: PropsWithChildren) {
  const entrance = useRef(new Animated.Value(0)).current;
  const ambient = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    }).start();
    // Slow, infinite ambient drift – adds a subtle "alive" feel without
    // being distracting on a TV.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambient, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(ambient, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [entrance, ambient]);

  const ambientTopStyle = {
    opacity: ambient.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
    transform: [
      {
        translateY: ambient.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 10],
        }),
      },
    ],
  };
  const ambientBottomStyle = {
    opacity: ambient.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
    transform: [
      {
        translateY: ambient.interpolate({
          inputRange: [0, 1],
          outputRange: [12, -12],
        }),
      },
    ],
  };

  return (
    <View style={styles.screen}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ambientTop, ambientTopStyle]}
      >
        <LinearGradient
          colors={['rgba(167,139,250,0.22)', 'rgba(103,232,249,0.06)', 'rgba(7,8,12,0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.ambientBottom, ambientBottomStyle]}
      >
        <LinearGradient
          colors={['rgba(94,234,212,0.14)', 'rgba(103,232,249,0.06)', 'rgba(7,8,12,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.vignette} />
      <Animated.View
        style={[
          styles.screenContent,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.985, 1],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function TopBar({
  active,
}: {
  active?: 'home' | 'search' | 'settings';
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to home"
        onPress={() => router.replace('/')}
        style={({ focused }) => [styles.brand, focused && styles.brandFocused]}
      >
        <View style={styles.brandMarkWrap}>
          <LinearGradient
            colors={GRADIENT_ACCENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.brandMarkText}>h</Text>
        </View>
        <Text style={styles.brandName}>
          hi<Text style={styles.brandNameAccent}>anime</Text>
        </Text>
      </Pressable>
      <View style={styles.navLinks}>
        <NavLink label="Home" active={active === 'home'} href="/" />
        <NavLink label="Search" active={active === 'search'} href="/explore" />
        <NavLink
          label="Settings"
          active={active === 'settings'}
          href={'/settings' as Href}
        />
      </View>
      <View style={styles.remoteHint}>
        <View style={styles.remoteDot} />
        <Text style={styles.topHint}>MADE FOR THE BIG SCREEN</Text>
      </View>
    </View>
  );
}

function NavLink({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: Href;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onFocusChange = (focused: boolean) => {
    Animated.spring(scale, {
      toValue: focused ? 1.06 : 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 360,
      mass: 0.55,
    }).start();
  };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      style={({ focused }) => [
        styles.navLink,
        focused && styles.navLinkFocused,
      ]}
    >
      {({ focused }) => (
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Text
            style={[
              styles.navLinkText,
              active && styles.navLinkTextActive,
              focused && styles.navLinkTextFocused,
            ]}
          >
            {label}
          </Text>
          {active || focused ? (
            <LinearGradient
              colors={focused ? GRADIENT_ACCENT : [colors.accentCyan, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.navLinkUnderline}
            />
          ) : (
            <View style={styles.navLinkUnderlinePlaceholder} />
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function AnimeRail({
  title,
  items,
}: {
  title: string;
  items: Anime[];
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.rail}>
      <SectionTitle title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railItems}
        directionalLockEnabled
        // Snap each card into place as focus traverses the rail so no
        // half-card ever sits at the edge.
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        // On TV, the smooth scroll-into-view of a focused card is driven by
        // the native focus engine; the snap interval above aligns the final
        // resting position to the card grid.
      >
        {items.map((anime, index) => (
          <AnimeCard
            key={anime._id ?? anime.slug ?? `${title}-${index}`}
            anime={anime}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function AnimeCard({ anime }: { anime: Anime }) {
  const slug = getAnimeSlug(anime);
  const title = getAnimeTitle(anime);
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const animateFocus = (focused: boolean) => {
    // Snappy spring: high stiffness, low mass, modest damping = fast settle
    // with a tiny overshoot. Feels "native" on a TV where latency matters
    // more than lingering polish.
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 340,
        mass: 0.6,
      }),
      Animated.spring(lift, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 320,
        mass: 0.6,
      }),
    ]).start();
  };

  const shadowStyle = {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
    shadowRadius: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }),
    elevation: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }),
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
      disabled={!slug}
      onPress={() => slug && router.push(animeDetailsHref(slug))}
      onFocus={() => animateFocus(true)}
      onBlur={() => animateFocus(false)}
      style={({ focused }) => [styles.card, focused && styles.cardFocused]}
    >
      {({ focused }) => (
        <Animated.View style={[{ transform: [{ scale }] }, shadowStyle]}>
          <View style={styles.posterFrame}>
            {anime.image ? (
              <Image
                source={{ uri: anime.image }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={220}
              />
            ) : (
              <View style={styles.posterFallback}>
                <Text style={styles.posterFallbackText}>{title.slice(0, 1)}</Text>
              </View>
            )}
            {/* Bottom scrim so the title/meta read well over any poster. */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(7,8,12,0.78)']}
              locations={[0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            {anime.Type ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{anime.Type}</Text>
              </View>
            ) : null}
            {/* Focused ring: a transparent-fill border outline that fades in. */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.posterFocusRing,
                { opacity: lift },
              ]}
            />
          </View>
          <Text
            numberOfLines={2}
            style={[styles.cardTitle, focused && styles.cardTitleFocused]}
          >
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {anime.totalEpisodes
              ? `${anime.totalEpisodes} episodes`
              : anime.Status || 'New series'}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export function Hero({
  anime,
  onDetails,
  onPlay,
}: {
  anime: Anime;
  onDetails: () => void;
  onPlay?: () => void;
}) {
  const title = getAnimeTitle(anime);
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [entrance, anime]);

  const imageParallax = {
    transform: [
      {
        translateX: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [1.06, 1],
        }),
      },
    ],
    opacity: entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  };
  const copySlide = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.hero}>
      {anime.landScapeImage || anime.image ? (
        <Animated.View style={[StyleSheet.absoluteFill, imageParallax]}>
          <Image
            source={{ uri: anime.landScapeImage || anime.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={280}
          />
        </Animated.View>
      ) : null}
      <LinearGradient
        colors={['rgba(7,8,12,0.05)', 'rgba(7,8,12,0.55)', colors.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(7,8,12,0.78)', 'rgba(7,8,12,0.08)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft colour wash – ties the hero to the new accent palette. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(103,232,249,0.08)', 'rgba(167,139,250,0.10)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.heroCopy, copySlide]}>
        <View style={styles.heroKicker}>
          <LinearGradient
            colors={GRADIENT_ACCENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroKickerLine}
          />
          <Text style={styles.eyebrow}>TONIGHT&apos;S PICK</Text>
        </View>
        <Text numberOfLines={2} style={styles.heroTitle}>
          {title}
        </Text>
        <Text numberOfLines={3} style={styles.heroSynopsis}>
          {anime.synopsis || 'Your next favorite story starts here.'}
        </Text>
        <View style={styles.heroMeta}>
          {anime.Score ? (
            <View style={[styles.metaChip, styles.metaChipScore]}>
              <Text style={styles.metaChipText}>★  {anime.Score}</Text>
            </View>
          ) : null}
          {anime.Type ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{anime.Type}</Text>
            </View>
          ) : null}
          {anime.genres?.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.metaChip}>
              <Text style={styles.metaChipText}>{genre}</Text>
            </View>
          ))}
        </View>
        <View style={styles.heroActions}>
          <ActionButton title="▶  Watch now" primary onPress={onDetails} />
          {onPlay ? <ActionButton title="Episodes" onPress={onPlay} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  primary,
  disabled,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const onFocusChange = (focused: boolean) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.06 : 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 380,
        mass: 0.5,
      }),
      Animated.timing(glow, {
        toValue: focused ? 1 : 0,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 18,
      stiffness: 500,
      mass: 0.4,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1.06,
      useNativeDriver: true,
      damping: 16,
      stiffness: 380,
      mass: 0.5,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ focused }) => [
        styles.actionButtonShell,
        focused && styles.actionButtonShellFocused,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Animated.View
        style={[
          styles.actionButton,
          primary && styles.actionButtonPrimary,
          { transform: [{ scale }] },
        ]}
      >
        {primary ? (
          <LinearGradient
            colors={GRADIENT_WARM}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.actionButtonGlow,
            { opacity: glow },
          ]}
        />
        <Text
          style={[
            styles.actionButtonText,
            primary && styles.actionButtonTextPrimary,
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function LoadingState({ label = 'Loading titles…' }: { label?: string }) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [sweep]);

  const translate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_WIDTH, SHIMMER_WIDTH],
  });

  const Shimmer = ({ style }: { style: object }) => (
    <View style={[style, styles.shimmerBase]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: translate }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.08)',
            'rgba(167,139,250,0.22)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.state}>
      <View style={styles.loadingMark}>
        <Shimmer style={styles.loadingPoster} />
        <View style={styles.loadingCopy}>
          <Shimmer style={styles.loadingLineLong} />
          <Shimmer style={styles.loadingLineShort} />
        </View>
      </View>
      <ActivityIndicator color={colors.accentCyan} size="small" />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

const SHIMMER_WIDTH = 320;

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <Text style={styles.errorTitle}>We couldn’t load this right now</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Text style={styles.stateText}>Check your connection and try again.</Text>
    </View>
  );
}

export const palette = colors;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { flex: 1 },
  ambientTop: {
    position: 'absolute',
    top: -260,
    right: -220,
    width: 780,
    height: 660,
    borderRadius: 400,
    overflow: 'hidden',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -360,
    left: -280,
    width: 720,
    height: 600,
    borderRadius: 360,
    overflow: 'hidden',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 80,
  } as object,
  topBar: {
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: '5%',
    gap: 38,
    zIndex: 2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  brandFocused: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brandMarkWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  brandMarkText: {
    color: '#0A0B10',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandName: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
  brandNameAccent: { color: colors.accentCyan },
  navLinks: { flexDirection: 'row', gap: 4 },
  navLink: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22 },
  navLinkFocused: { backgroundColor: colors.surfaceGlass },
  navLinkText: { color: colors.muted, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  navLinkTextActive: { color: colors.text },
  navLinkTextFocused: { color: colors.text },
  navLinkUnderline: { marginTop: 6, height: 3, width: 26, borderRadius: 2 },
  navLinkUnderlinePlaceholder: { marginTop: 6, height: 3, width: 26 },
  remoteHint: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 9 },
  remoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
    shadowColor: colors.mint,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  topHint: {
    color: '#6B7384',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  hero: { height: 560, marginTop: -88, justifyContent: 'flex-end' },
  heroCopy: { width: '56%', paddingLeft: '6%', paddingBottom: 56, gap: 18 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroKickerLine: { width: 34, height: 3, borderRadius: 2 },
  eyebrow: { color: colors.accentCyan, fontSize: 12, fontWeight: '800', letterSpacing: 2.4 },
  heroTitle: {
    color: colors.text,
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 58,
    letterSpacing: -1.6,
  },
  heroSynopsis: { color: colors.mutedSoft, fontSize: 16, lineHeight: 25 },
  heroMeta: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginTop: 2 },
  metaChip: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaChipScore: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderColor: 'rgba(251,191,36,0.4)',
  },
  metaChipText: {
    color: '#E7EAF0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionButtonShell: { borderRadius: 26 },
  actionButtonShellFocused: {},
  actionButton: {
    minHeight: 52,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionButtonPrimary: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowColor: colors.accentWarm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  actionButtonGlow: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.accentCyan,
    shadowColor: colors.accentCyan,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  actionButtonDisabled: { opacity: 0.35 },
  actionButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionButtonTextPrimary: { color: '#1C1206' },
  rail: { marginTop: 24, marginBottom: 22 },
  sectionHeading: { paddingHorizontal: '5%', marginBottom: 14 },
  sectionTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  railItems: {
    // Extra horizontal padding so the first/last card can grow to 1.08× on
    // focus without being clipped by the screen edge.
    paddingHorizontal: '6%',
    paddingTop: 18,
    paddingBottom: 30,
    gap: CARD_GAP,
  },
  card: { width: CARD_WIDTH, borderRadius: 18, paddingBottom: 6 },
  cardFocused: { zIndex: 1 },
  posterFrame: {
    height: 258,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  posterFocusRing: {
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.accentCyan,
    backgroundColor: 'transparent',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B25',
  },
  posterFallbackText: { color: colors.muted, fontSize: 54, fontWeight: '800' },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(7,8,12,0.78)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typeBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 19,
  },
  cardTitleFocused: { color: colors.accentCyan },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  state: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 12,
  },
  loadingMark: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  loadingPoster: { width: 78, height: 110, borderRadius: 14 },
  loadingCopy: { flex: 1, gap: 12 },
  loadingLineLong: { height: 13, width: '95%', borderRadius: 7 },
  loadingLineShort: { height: 10, width: '62%', borderRadius: 6 },
  shimmerBase: {
    overflow: 'hidden',
    backgroundColor: '#1A1F2B',
  },
  stateText: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
});
