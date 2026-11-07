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
  }, [query]);

  return (
    <ScreenFrame>
      <TopBar active="search" />
      <View style={styles.searchArea}>
        <Text style={styles.eyebrow}>FIND YOUR NEXT SERIES</Text>
        <Text style={styles.title}>Search anime</Text>
        <Text style={styles.subtitle}>
          Search by title. Use your remote to focus the field and enter a name.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Try “Demon Slayer”"
          placeholderTextColor="#858B98"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search anime by title"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          style={[styles.input, inputFocused && styles.inputFocused]}
        />
        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.messageText}>Searching…</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} />
        ) : hasSearched && results.length === 0 ? (
          <Text style={styles.messageText}>No titles found. Try another search.</Text>
        ) : hasSearched ? (
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
        ) : (
          <Text style={styles.messageText}>
            Search results will appear here as you type.
          </Text>
        )}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  searchArea: { flex: 1, paddingHorizontal: '6%', paddingTop: 26 },
  eyebrow: { color: '#B9AFFF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 34, fontWeight: '900', marginTop: 7 },
  subtitle: { color: palette.muted, fontSize: 15, marginTop: 8, marginBottom: 20 },
  input: {
    width: '75%',
    minHeight: 58,
    color: palette.text,
    backgroundColor: palette.surfaceRaised,
    borderWidth: 2,
    borderColor: '#343844',
    borderRadius: 9,
    paddingHorizontal: 18,
    fontSize: 18,
  },
  inputFocused: { borderColor: '#B9AFFF' },
  resultsScroll: { flex: 1, marginTop: 17 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingVertical: 8 },
  message: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 28 },
  messageText: { color: palette.muted, fontSize: 15, marginTop: 24 },
});
