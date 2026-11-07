import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Anime, getAnimeSlug, getAnimeTitle } from '@/api/anime';

const colors = {
  background: '#08090D',
  surface: '#11131A',
  surfaceRaised: '#1B1E27',
  text: '#F6F7FB',
  muted: '#A1A7B4',
  accent: '#7C5CFF',
};

export function animeDetailsHref(slug: string): Href {
  return `/anime/${encodeURIComponent(slug)}` as Href;
}

export function ScreenFrame({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
}

export function TopBar({ active }: { active?: 'home' | 'search' }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to home"
        onPress={() => router.replace('/')}
        style={({ focused }) => [styles.brand, focused && styles.brandFocused]}
      >
        <Text style={styles.brandMark}>H</Text>
        <Text style={styles.brandName}>HIANIME</Text>
      </Pressable>
      <View style={styles.navLinks}>
        <NavLink label="Home" active={active === 'home'} href="/" />
        <NavLink label="Search" active={active === 'search'} href="/explore" />
      </View>
      <Text style={styles.topHint}>ANIME, ON YOUR TV</Text>
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ focused }) => [
        styles.navLink,
        active && styles.navLinkActive,
        focused && styles.navLinkFocused,
      ]}
    >
      <Text style={[styles.navLinkText, active && styles.navLinkTextActive]}>
        {label}
      </Text>
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
      disabled={!slug}
      onPress={() => slug && router.push(animeDetailsHref(slug))}
      style={({ focused }) => [styles.card, focused && styles.cardFocused]}
    >
      <View style={styles.posterFrame}>
        {anime.image ? (
          <Image
            source={{ uri: anime.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={styles.posterFallback}>
            <Text style={styles.posterFallbackText}>{title.slice(0, 1)}</Text>
          </View>
        )}
        {anime.Type ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{anime.Type}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.cardTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.cardMeta}>
        {anime.Status || `${anime.totalEpisodes ?? 'New'} episodes`}
      </Text>
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
  return (
    <View style={styles.hero}>
      {anime.landScapeImage || anime.image ? (
        <Image
          source={{ uri: anime.landScapeImage || anime.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(8,9,13,0.06)', 'rgba(8,9,13,0.6)', colors.background]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(8,9,13,0.68)', 'rgba(8,9,13,0.05)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>FEATURED SERIES</Text>
        <Text numberOfLines={2} style={styles.heroTitle}>
          {title}
        </Text>
        <Text numberOfLines={3} style={styles.heroSynopsis}>
          {anime.synopsis || 'Your next favorite story starts here.'}
        </Text>
        <View style={styles.heroMeta}>
          {anime.Score ? <Text style={styles.metaChip}>★ {anime.Score}</Text> : null}
          {anime.Type ? <Text style={styles.metaChip}>{anime.Type}</Text> : null}
          {anime.genres?.slice(0, 3).map((genre) => (
            <Text key={genre} style={styles.metaChip}>
              {genre}
            </Text>
          ))}
        </View>
        <View style={styles.heroActions}>
          <ActionButton title="View details" primary onPress={onDetails} />
          {onPlay ? <ActionButton title="Browse episodes" onPress={onPlay} /> : null}
        </View>
      </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ focused, pressed }) => [
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        focused && styles.actionButtonFocused,
        pressed && styles.actionButtonPressed,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Text style={styles.actionButtonText}>{title}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = 'Loading titles…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

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
  topBar: {
    height: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: '5%',
    gap: 42,
    zIndex: 2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
  },
  brandFocused: { backgroundColor: colors.surfaceRaised },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: colors.accent,
    color: colors.text,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 23,
    fontWeight: '900',
  },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  navLinks: { flexDirection: 'row', gap: 8 },
  navLink: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 9 },
  navLinkActive: { backgroundColor: colors.surfaceRaised },
  navLinkFocused: { backgroundColor: colors.accent },
  navLinkText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  navLinkTextActive: { color: colors.text },
  topHint: {
    marginLeft: 'auto',
    color: '#777D89',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  hero: { height: 500, marginTop: -82, justifyContent: 'flex-end' },
  heroCopy: { width: '52%', paddingLeft: '6%', paddingBottom: 38, gap: 14 },
  eyebrow: { color: '#B9AFFF', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { color: colors.text, fontSize: 42, fontWeight: '900', lineHeight: 49 },
  heroSynopsis: { color: '#D0D2D9', fontSize: 16, lineHeight: 23 },
  heroMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    overflow: 'hidden',
    color: '#E8E8EE',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 3 },
  actionButton: {
    minHeight: 47,
    paddingHorizontal: 21,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#292C35',
  },
  actionButtonPrimary: { backgroundColor: colors.accent },
  actionButtonFocused: { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.04 }] },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonDisabled: { opacity: 0.35 },
  actionButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  rail: { marginTop: 13, marginBottom: 27 },
  sectionHeading: { paddingHorizontal: '5%', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 23, fontWeight: '800' },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  railItems: { paddingHorizontal: '5%', paddingTop: 8, paddingBottom: 12, gap: 17 },
  card: { width: 176, borderRadius: 9, paddingBottom: 4 },
  cardFocused: { transform: [{ scale: 1.06 }], zIndex: 1 },
  posterFrame: {
    height: 246,
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#242731',
  },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  posterFallbackText: { color: colors.muted, fontSize: 52, fontWeight: '800' },
  typeBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: 'rgba(8,9,13,0.8)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  typeBadgeText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 9, lineHeight: 19 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  state: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 12,
  },
  stateText: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
});
