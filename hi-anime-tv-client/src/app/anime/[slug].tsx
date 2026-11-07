import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Anime,
  Episode,
  getAnime,
  getAnimeTitle,
  getEpisodes,
} from '@/api/anime';
import {
  ActionButton,
  ErrorState,
  LoadingState,
  ScreenFrame,
  TopBar,
  palette,
} from '@/components/catalog-ui';

type Language = 'sub' | 'dub';

export default function AnimeDetailsScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [language, setLanguage] = useState<Language>('sub');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusCycle, setFocusCycle] = useState(0);
  const wasBlurred = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (wasBlurred.current) {
        setFocusCycle((current) => current + 1);
      }
      wasBlurred.current = false;
      return () => {
        wasBlurred.current = true;
      };
    }, []),
  );

  useEffect(() => {
    if (!slug) {
      setError('This title does not have a valid page address.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    Promise.resolve()
      .then(async () => {
        const detail = await getAnime(slug);
        const total = Number(detail.totalEpisodes) || detail.episodes?.length || 0;
        const initialEpisodes = detail.episodes ?? [];
        const listedEpisodes =
          detail._id && total > initialEpisodes.length
            ? await getEpisodes(detail._id, 1, Math.min(total, 24))
            : initialEpisodes;
        if (active) {
          setAnime(detail);
          setEpisodes(listedEpisodes);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load title.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [focusCycle, slug]);

  const playEpisode = (episode: Episode, selected: Language) => {
    const url = episode.link?.[selected]?.[0];
    if (!url || !anime) return;
    const alternateLanguage: Language = selected === 'sub' ? 'dub' : 'sub';
    const alternateUrl = episode.link?.[alternateLanguage]?.[0] ?? '';

    const query = new URLSearchParams({
      url,
      alternateUrl,
      language: selected,
      alternateLanguage,
      title: getAnimeTitle(anime),
      episode: String(episode.episodeNumber ?? ''),
    }).toString();
    router.push(`/watch?${query}` as Href);
  };

  const loadMoreEpisodes = async () => {
    if (!anime?._id || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError('');
    const start = episodes.length + 1;
    const end = Math.min(Number(anime.totalEpisodes) || start + 23, start + 23);
    try {
      const nextEpisodes = await getEpisodes(anime._id, start, end);
      if (nextEpisodes.length === 0) {
        setLoadMoreError('The API returned no additional episodes.');
      } else {
        setEpisodes((current) => [...current, ...nextEpisodes]);
      }
    } catch (cause) {
      setLoadMoreError(
        cause instanceof Error ? cause.message : 'Unable to load more episodes.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const totalEpisodes = Number(anime?.totalEpisodes) || 0;

  return (
    <ScreenFrame>
      <TopBar />
      {loading ? (
        <LoadingState label="Loading title…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : anime ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.detailHero}>
            {anime.landScapeImage || anime.image ? (
              <Image
                source={{ uri: anime.landScapeImage || anime.image }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : null}
            <LinearGradient
              colors={['rgba(9,11,16,0.28)', 'rgba(9,11,16,0.96)']}
              start={{ x: 0.4, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.detailShade}
            />
            {anime.image ? (
              <Image
                source={{ uri: anime.image }}
                style={styles.detailPoster}
                contentFit="cover"
                transition={200}
              />
            ) : null}
            <View style={styles.detailCopy}>
              <Text style={styles.eyebrow}>SERIES DETAILS</Text>
              <Text style={styles.title}>{getAnimeTitle(anime)}</Text>
              <Text style={styles.meta}>
                {[anime.Type, anime.Status, anime.Score && `★ ${anime.Score}`]
                  .filter(Boolean)
                  .join('  ·  ')}
              </Text>
              <Text style={styles.synopsis} numberOfLines={5}>
                {anime.synopsis || 'Synopsis unavailable.'}
              </Text>
              <View style={styles.genres}>
                {anime.genres?.slice(0, 5).map((genre) => (
                  <Text key={genre} style={styles.genre}>
                    {genre}
                  </Text>
                ))}
              </View>
              <ActionButton
                title="←  Back"
                onPress={() => router.back()}
              />
            </View>
          </View>
          <View style={styles.episodeSection}>
            <Text style={styles.episodeTitle}>Episodes</Text>
            <Text style={styles.episodeSubtitle}>
              Choose a language, then select an episode.
            </Text>
            <View style={styles.languageRow}>
              <LanguageButton
                label="Japanese · Sub"
                selected={language === 'sub'}
                onPress={() => setLanguage('sub')}
              />
              <LanguageButton
                label="English · Dub"
                selected={language === 'dub'}
                onPress={() => setLanguage('dub')}
              />
            </View>
            {episodes.length ? (
              <>
                <View style={styles.episodeGrid}>
                  {episodes.map((episode, index) => {
                    const available = !!episode.link?.[language]?.[0];
                    const number = episode.episodeNumber ?? index + 1;
                    return (
                      <Pressable
                        key={episode._id ?? episode.slug ?? `episode-${number}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${available ? 'Play' : 'Unavailable'} episode ${number} ${language === 'sub' ? 'subbed' : 'dubbed'}`}
                        disabled={!available}
                        onPress={() => playEpisode(episode, language)}
                        style={({ focused }) => [
                          styles.episodeCard,
                          focused && styles.episodeCardFocused,
                          !available && styles.episodeUnavailable,
                        ]}
                      >
                        <Text style={styles.episodeNumber}>
                          {String(number).padStart(2, '0')}
                        </Text>
                        <View style={styles.episodeInfo}>
                          <Text style={styles.episodeName}>
                            {episode.title || `Episode ${number}`}
                          </Text>
                          <Text style={styles.episodeLanguage}>
                            {available
                              ? `${language === 'sub' ? 'SUB' : 'DUB'}  ·  PLAY`
                              : `${language === 'sub' ? 'SUB' : 'DUB'}  ·  UNAVAILABLE`}
                          </Text>
                        </View>
                        <Text style={styles.playIcon}>{available ? '▶' : '—'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {totalEpisodes > episodes.length ? (
                  <View style={styles.loadMore}>
                    <ActionButton
                      title={loadingMore ? 'Loading episodes…' : 'Load more episodes'}
                      disabled={loadingMore}
                      onPress={loadMoreEpisodes}
                    />
                    {loadMoreError ? (
                      <Text style={styles.loadMoreError}>{loadMoreError}</Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.emptyEpisodes}>
                <Text style={styles.episodeSubtitle}>No episodes are listed yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </ScreenFrame>
  );
}

function LanguageButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ focused }) => [
        styles.languageButton,
        selected && styles.languageSelected,
        focused && styles.languageFocused,
      ]}
    >
      <Text style={styles.languageText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  detailHero: {
    minHeight: 430,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: '8%',
    paddingVertical: 38,
    gap: 42,
    overflow: 'hidden',
  },
  detailShade: { ...StyleSheet.absoluteFill },
  detailPoster: {
    width: 220,
    height: 310,
    borderRadius: 16,
    backgroundColor: palette.surface,
  },
  detailCopy: { flex: 1, maxWidth: 760, gap: 13 },
  eyebrow: { color: palette.mint, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 38, fontWeight: '800', lineHeight: 45 },
  meta: { color: '#D5D7DF', fontSize: 14, fontWeight: '600' },
  synopsis: { color: '#BEC2CC', fontSize: 15, lineHeight: 23 },
  genres: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  genre: {
    color: palette.text,
    backgroundColor: '#1C222C',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
  },
  episodeSection: { paddingHorizontal: '8%', paddingTop: 12 },
  episodeTitle: { color: palette.text, fontSize: 26, fontWeight: '800' },
  episodeSubtitle: { color: palette.muted, fontSize: 14, marginTop: 6 },
  languageRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 19 },
  languageButton: {
    backgroundColor: '#171C25',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
  },
  languageSelected: { backgroundColor: '#302644' },
  languageFocused: { borderWidth: 2, borderColor: palette.accentSoft },
  languageText: { color: palette.text, fontSize: 14, fontWeight: '800' },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  episodeCard: {
    width: '31%',
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#11161E',
    borderWidth: 1,
    borderColor: '#252D38',
  },
  episodeCardFocused: {
    backgroundColor: '#252035',
    borderColor: palette.accentSoft,
    transform: [{ scale: 1.03 }],
  },
  episodeUnavailable: { opacity: 0.45 },
  episodeNumber: { color: palette.accentSoft, fontSize: 22, fontWeight: '800' },
  episodeInfo: { flex: 1, gap: 5 },
  episodeName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  episodeLanguage: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  playIcon: { color: palette.text, fontSize: 14 },
  emptyEpisodes: { paddingVertical: 30, alignItems: 'center', gap: 12 },
  loadMore: { alignItems: 'flex-start', marginTop: 18, gap: 8 },
  loadMoreError: { color: '#FF9A9A', fontSize: 13 },
});
