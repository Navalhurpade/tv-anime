import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Anime, searchAnime } from '@/api/anime';
import {
  AnimeCard,
  ErrorState,
  ScreenFrame,
  TopBar,
  palette,
} from '@/components/catalog-ui';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [focusCycle, setFocusCycle] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setFocusCycle((current) => current + 1);
    }, []),
  );

  useEffect(() => {
    const title = query.trim();
    if (!title) {
      setResults([]);
      setError('');
      setLoading(false);
      setHasSearched(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      searchAnime(title)
        .then((items) => {
          if (active) {
            setResults(items);
            setHasSearched(true);
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Search failed.');
            setHasSearched(true);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, focusCycle]);

  return (
    <ScreenFrame>
      <TopBar active="search" />
      <View style={styles.searchArea}>
        <Text style={styles.eyebrow}>YOUR NEXT FAVORITE STARTS HERE</Text>
        <Text style={styles.title}>Search anime</Text>
        <Text style={styles.subtitle}>
          Find your next world to get lost in.
        </Text>
        <View style={[styles.searchBox, inputFocused && styles.inputFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title…"
            placeholderTextColor="#858B98"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search anime by title"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={styles.input}
          />
          {query ? (
            <Text style={styles.searchHint}>SEARCHING THE LIBRARY</Text>
          ) : null}
        </View>
        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.messageText}>Finding your next favorite…</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} />
        ) : hasSearched && results.length === 0 ? (
          <Text style={styles.messageText}>No titles found. Try another search.</Text>
        ) : hasSearched ? (
          <>
            <Text style={styles.resultCount}>
              {results.length} {results.length === 1 ? 'title' : 'titles'} found
            </Text>
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.results}
              showsVerticalScrollIndicator={false}
            >
              {results.map((anime, index) => (
                <AnimeCard
                  key={anime._id ?? anime.slug ?? `result-${index}`}
                  anime={anime}
                />
              ))}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyGlyph}>
              <Text style={styles.emptyGlyphText}>⌕</Text>
            </View>
            <Text style={styles.emptyTitle}>A whole universe awaits.</Text>
            <Text style={styles.emptyCopy}>
              Search for a series using your remote.
            </Text>
          </View>
        )}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  searchArea: { flex: 1, paddingHorizontal: '6%', paddingTop: 32 },
  eyebrow: { color: palette.mint, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 38, fontWeight: '800', marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 16, marginTop: 8, marginBottom: 25 },
  searchBox: {
    width: '78%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 18,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
  },
  searchIcon: { color: palette.accentSoft, fontSize: 33, lineHeight: 40 },
  input: { flex: 1, minHeight: 58, color: palette.text, fontSize: 19 },
  searchHint: { color: '#747E8B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  inputFocused: { borderColor: palette.accentSoft, borderWidth: 2 },
  resultsScroll: { flex: 1, marginTop: 17 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, paddingVertical: 10 },
  resultCount: { color: palette.muted, fontSize: 13, marginTop: 22 },
  message: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 28 },
  messageText: { color: palette.muted, fontSize: 15 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 45 },
  emptyGlyph: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#211B30',
  },
  emptyGlyphText: { color: palette.accentSoft, fontSize: 40, lineHeight: 48 },
  emptyTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 19 },
  emptyCopy: { color: palette.muted, fontSize: 14, marginTop: 7 },
});
