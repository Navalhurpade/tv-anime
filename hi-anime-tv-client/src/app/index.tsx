import { useFocusEffect } from 'expo-router';
import { Href, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Anime,
  clearLastWatched,
  getLastWatched,
  getAnimeSlug,
  getHome,
  HomeCollection,
  LastWatched,
  unwrapFeatured,
} from '@/api/anime';
import {
  animeDetailsHref,
  ActionButton,
  AnimeRail,
  ErrorState,
  Hero,
  LoadingState,
  palette,
  ScreenFrame,
  TopBar,
} from '@/components/catalog-ui';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const [home, setHome] = useState<HomeCollection | null>(null);
  const [error, setError] = useState('');
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null);
  const [resumeError, setResumeError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError('');
      getHome()
        .then((result) => {
          if (active) setHome(result);
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error ? cause.message : 'Unable to load home.',
            );
          }
        });
      getLastWatched()
        .then((session) => {
          if (active) {
            setLastWatched(session);
            setResumeError('');
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setResumeError(
              cause instanceof Error
                ? cause.message
                : 'Unable to load your saved episode.',
            );
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const featured = useMemo(() => unwrapFeatured(home?.featured), [home]);
  const heroAnime = featured[0] ?? home?.trending?.animes?.[0];

  return (
    <ScreenFrame>
      <TopBar active="home" />
      {error ? (
        <ErrorState message={error} />
      ) : !home ? (
        <LoadingState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {heroAnime ? <FeaturedHero anime={heroAnime} /> : null}
          {resumeError ? <Text style={styles.resumeError}>{resumeError}</Text> : null}
          {lastWatched ? (
            <ContinueWatching
              session={lastWatched}
              onDismiss={() => {
                clearLastWatched()
                  .then(() => setLastWatched(null))
                  .catch((cause: unknown) => {
                    setResumeError(
                      cause instanceof Error
                        ? cause.message
                        : 'Unable to clear your saved episode.',
                    );
                  });
              }}
            />
          ) : null}
          <AnimeRail
            title="Fresh episodes"
            items={
              home.latestEpisodes?.episodes
                ?.map((episode) => episode.anime_info)
                .filter((anime): anime is Anime => !!anime) ?? []
            }
          />
          <AnimeRail title="Trending now" items={home.trending?.animes ?? []} />
          <AnimeRail
            title="New on HiAnime"
            items={home.latestAnime?.animes ?? []}
          />
          <AnimeRail title="Featured" items={featured} />
          <AnimeRail title="Popular anime" items={home.popular?.animes ?? []} />
          <AnimeRail
            title="Currently airing"
            items={home.currentlyAiring?.animes ?? []}
          />
          <AnimeRail
            title="Finished series"
            items={home.finishedAiring?.animes ?? []}
          />
        </ScrollView>
      )}
    </ScreenFrame>
  );
}

function ContinueWatching({
  session,
  onDismiss,
}: {
  session: LastWatched;
  onDismiss: () => void;
}) {
  const resume = () => {
    if (!session.streams.length) return;
    const query = new URLSearchParams({
      streams: JSON.stringify(session.streams),
      alternateStreams: JSON.stringify(session.alternateStreams),
      language: session.language,
      alternateLanguage: session.alternateLanguage,
      title: session.title,
      episode: session.episode,
      episodeIndex: String(session.episodeIndex),
      animeId: session.animeId,
      animeSlug: session.animeSlug,
      image: session.image ?? '',
      totalEpisodes: String(session.totalEpisodes),
    });
    router.push(`/watch?${query.toString()}` as Href);
  };

  return (
    <View style={styles.continueSection}>
      <View style={styles.continueHeading}>
        <View>
          <Text style={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text>
          <Text style={styles.continueTitle}>Continue watching</Text>
        </View>
        <ActionButton title="Remove" onPress={onDismiss} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Continue ${session.title}, episode ${session.episode}`}
        disabled={!session.streams.length}
        onPress={resume}
        style={({ focused, pressed }) => [
          styles.continueCard,
          focused && styles.continueFocused,
          pressed && styles.continuePressed,
        ]}
      >
        {session.image ? (
          <Image
            source={{ uri: session.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(10,12,17,0.12)', 'rgba(10,12,17,0.94)']}
          locations={[0, 0.72]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.continueDetails}>
          <Text numberOfLines={1} style={styles.continueAnimeTitle}>
            {session.title}
          </Text>
          <Text style={styles.continueEpisode}>
            EPISODE {session.episode || session.episodeIndex} ·{' '}
            {session.language.toUpperCase()}
          </Text>
          <Text style={styles.resumeLabel}>
            {session.streams.length
              ? 'Resume this episode'
              : 'No saved stream is available'}
          </Text>
        </View>
        <View style={styles.playButton}>
          <Text style={styles.playButtonText}>▶</Text>
        </View>
      </Pressable>
      <Text style={styles.resumeDisclaimer}>
        Your episode is saved on this device. Playback resumes from the start of
        the episode.
      </Text>
    </View>
  );
}

function FeaturedHero({ anime }: { anime: Anime }) {
  const slug = getAnimeSlug(anime);
  return (
    <Hero
      anime={anime}
      onDetails={() => {
        if (slug) router.push(animeDetailsHref(slug));
      }}
      onPlay={() => {
        if (slug) router.push(animeDetailsHref(slug));
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 52 },
  continueSection: { marginHorizontal: 48, marginTop: 26, marginBottom: 6 },
  continueHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrow: {
    color: palette.mint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  continueTitle: { color: palette.text, fontSize: 24, fontWeight: '700' },
  continueCard: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 224,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 22,
    width: '100%',
  },
  continueFocused: {
    borderColor: palette.accentSoft,
    transform: [{ scale: 1.012 }],
  },
  continuePressed: { opacity: 0.88 },
  continueDetails: { maxWidth: '76%' },
  continueAnimeTitle: { color: palette.text, fontSize: 25, fontWeight: '700' },
  continueEpisode: {
    color: palette.mint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
  },
  resumeLabel: { color: palette.text, fontSize: 15, marginTop: 6 },
  playButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 26,
    bottom: 24,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    width: 52,
  },
  playButtonText: { color: palette.background, fontSize: 18, marginLeft: 3 },
  resumeDisclaimer: { color: palette.muted, fontSize: 12, marginTop: 8 },
  resumeError: {
    color: '#FFB4AB',
    marginHorizontal: 48,
    marginTop: 14,
  },
});
