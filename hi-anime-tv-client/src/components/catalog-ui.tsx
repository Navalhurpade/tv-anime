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
  background: '#090B10',
  surface: '#11151D',
  surfaceRaised: '#1A202A',
  text: '#F4F5F7',
  muted: '#9AA2AD',
  accent: '#A98BFA',
  accentSoft: '#D5C6FF',
  mint: '#A3E5D2',
  line: '#252B35',
};

export function animeDetailsHref(slug: string): Href {
  return `/anime/${encodeURIComponent(slug)}` as Href;
}

export function ScreenFrame({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
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
        <Text style={styles.brandMark}>h</Text>
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
      {({ focused }) => (
        <Text
          style={[
            styles.navLinkText,
            active && styles.navLinkTextActive,
            focused && styles.navLinkTextFocused,
          ]}
        >
          {label}
        </Text>
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
      {({ focused }) => (
        <>
          <View
            style={[
              styles.posterFrame,
              focused && styles.posterFrameFocused,
            ]}
          >
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
            {anime.totalEpisodes
              ? `${anime.totalEpisodes} episodes`
              : anime.Status || 'New series'}
          </Text>
        </>
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
        <View style={styles.heroKicker}>
          <View style={styles.heroKickerLine} />
          <Text style={styles.eyebrow}>TONIGHT&apos;S PICK</Text>
        </View>
        <Text numberOfLines={2} style={styles.heroTitle}>
          {title}
        </Text>
        <Text numberOfLines={3} style={styles.heroSynopsis}>
          {anime.synopsis || 'Your next favorite story starts here.'}
        </Text>
        <View style={styles.heroMeta}>
          {anime.Score ? <Text style={styles.metaChip}>★  {anime.Score}</Text> : null}
          {anime.Type ? <Text style={styles.metaChip}>{anime.Type}</Text> : null}
          {anime.genres?.slice(0, 3).map((genre) => (
            <Text key={genre} style={styles.metaChip}>
              {genre}
            </Text>
          ))}
        </View>
        <View style={styles.heroActions}>
          <ActionButton title="Explore series  ›" primary onPress={onDetails} />
          {onPlay ? <ActionButton title="Episodes" onPress={onPlay} /> : null}
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
      <Text
        style={[
          styles.actionButtonText,
          primary && styles.actionButtonTextPrimary,
        ]}
      >
        {title}
      </Text>
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
    gap: 8,
    paddingVertical: 8,
    paddingRight: 10,
    borderRadius: 12,
  },
  brandFocused: { backgroundColor: colors.surfaceRaised, paddingLeft: 8 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#B598FF',
    color: '#181226',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 27,
    fontWeight: '800',
  },
  brandName: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  brandNameAccent: { color: colors.accentSoft },
  navLinks: { flexDirection: 'row', gap: 5 },
  navLink: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 22 },
  navLinkActive: { backgroundColor: '#211B30' },
  navLinkFocused: { backgroundColor: colors.accentSoft },
  navLinkText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  navLinkTextActive: { color: colors.accentSoft },
  navLinkTextFocused: { color: '#181226' },
  remoteHint: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 9 },
  remoteDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mint },
  topHint: {
    color: '#727A86',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  hero: { height: 550, marginTop: -88, justifyContent: 'flex-end' },
  heroCopy: { width: '56%', paddingLeft: '6%', paddingBottom: 50, gap: 16 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroKickerLine: { width: 22, height: 2, backgroundColor: colors.mint },
  eyebrow: { color: colors.mint, fontSize: 12, fontWeight: '800', letterSpacing: 2.2 },
  heroTitle: { color: colors.text, fontSize: 46, fontWeight: '800', lineHeight: 54, letterSpacing: -1.2 },
  heroSynopsis: { color: '#C4C9D1', fontSize: 16, lineHeight: 24 },
  heroMeta: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginTop: 1 },
  metaChip: {
    overflow: 'hidden',
    color: '#DDE2E8',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 3 },
  actionButton: {
    minHeight: 50,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: '#252B35',
  },
  actionButtonPrimary: { backgroundColor: colors.accentSoft },
  actionButtonFocused: { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.04 }] },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonDisabled: { opacity: 0.35 },
  actionButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  actionButtonTextPrimary: { color: '#211A30' },
  rail: { marginTop: 20, marginBottom: 22 },
  sectionHeading: { paddingHorizontal: '5%', marginBottom: 13 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.35 },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  railItems: { paddingHorizontal: '5%', paddingTop: 7, paddingBottom: 14, gap: 19 },
  card: { width: 180, borderRadius: 14, paddingBottom: 6 },
  cardFocused: { transform: [{ scale: 1.055 }], zIndex: 1 },
  posterFrame: {
    height: 252,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  posterFrameFocused: { borderWidth: 3, borderColor: colors.accentSoft },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171C26' },
  posterFallbackText: { color: colors.muted, fontSize: 52, fontWeight: '800' },
  typeBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: 'rgba(9,11,16,0.82)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  typeBadgeText: { color: colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 11, lineHeight: 19 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
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
