import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Anime,
  getAnimeSlug,
  getHome,
  getAnimeTitle,
  HomeCollection,
  unwrapFeatured,
} from '@/api/anime';
import {
  animeDetailsHref,
  AnimeRail,
  ErrorState,
  Hero,
  LoadingState,
  ScreenFrame,
  TopBar,
} from '@/components/catalog-ui';

export default function HomeScreen() {
  const [home, setHome] = useState<HomeCollection | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getHome()
      .then((result) => {
        if (active) setHome(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load home.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

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
          <AnimeRail title="Featured" items={featured} />
          <AnimeRail title="Trending now" items={home.trending?.animes ?? []} />
          <AnimeRail title="Popular anime" items={home.popular?.animes ?? []} />
          <AnimeRail
            title="Currently airing"
            items={home.currentlyAiring?.animes ?? []}
          />
          <AnimeRail
            title="Recently added"
            items={home.latestAnime?.animes ?? []}
          />
          <AnimeRail
            title="New episodes"
            items={
              home.latestEpisodes?.episodes
                ?.map((episode) => episode.anime_info)
                .filter((anime): anime is Anime => !!anime) ?? []
            }
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
});
