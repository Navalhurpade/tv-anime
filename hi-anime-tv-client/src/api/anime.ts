import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_API_BASE_URL = 'https://animehot.cc/api';
const API_BASE_URL_KEY = 'hianime.apiBaseUrl';

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('Enter an API base URL.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL, such as https://animehot.cc/api.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('The API URL must start with http:// or https://.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The API URL must not include credentials, a query, or a fragment.');
  }

  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path.toLowerCase().endsWith('/api') ? path : `${path}/api`}`;
}

export async function getApiBaseUrl(): Promise<string> {
  const savedUrl = await AsyncStorage.getItem(API_BASE_URL_KEY);
  return savedUrl ? normalizeApiBaseUrl(savedUrl) : DEFAULT_API_BASE_URL;
}

export async function saveApiBaseUrl(value: string): Promise<string> {
  const normalizedUrl = normalizeApiBaseUrl(value);
  await AsyncStorage.setItem(API_BASE_URL_KEY, normalizedUrl);
  return normalizedUrl;
}

export type Anime = {
  _id?: string;
  title?: string;
  English?: string;
  Japanese?: string;
  slug?: string;
  slugs?: (string | null)[];
  image?: string;
  landScapeImage?: string;
  synopsis?: string;
  genres?: string[];
  Type?: string;
  Status?: string;
  Score?: string;
  totalEpisodes?: number | string;
  totalSubbed?: number;
  totalDubbed?: number;
  episodes?: Episode[];
};

export type Episode = {
  _id?: string;
  title?: string;
  episodeNumber?: number;
  slug?: string;
  link?: {
    sub?: string[];
    dub?: string[];
  };
};

export type LatestEpisode = Episode & {
  anime_info?: Anime;
};

export type HomeCollection = {
  featured?: ({ anime?: Anime } | Anime)[];
  trending?: { animes?: Anime[] };
  popular?: { animes?: Anime[] };
  currentlyAiring?: { animes?: Anime[] };
  finishedAiring?: { animes?: Anime[] };
  latestAnime?: { animes?: Anime[] };
  latestEpisodes?: { episodes?: LatestEpisode[] };
};

async function request<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const apiBaseUrl = baseUrl
    ? normalizeApiBaseUrl(baseUrl)
    : await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Anime API returned ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

export function getHome(baseUrl?: string): Promise<HomeCollection> {
  return request<HomeCollection>(
    '/home?slugNth=10&includeSlugs=false',
    undefined,
    baseUrl,
  );
}

export async function searchAnime(title: string): Promise<Anime[]> {
  const results = await request<Anime[] | { animes?: Anime[] }>('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return Array.isArray(results) ? results : (results.animes ?? []);
}

export async function getAnime(slug: string): Promise<Anime> {
  const result = await request<Anime | { anime?: Anime }>(
    `/anime/${encodeURIComponent(slug)}`,
  );
  const nestedAnime = (result as { anime?: Anime }).anime;
  return nestedAnime ?? (result as Anime);
}

export async function getEpisodes(
  animeId: string,
  start: number,
  end: number,
): Promise<Episode[]> {
  const result = await request<{ episodes?: Episode[] }>(
    `/episodes/${encodeURIComponent(animeId)}?start=${start}&end=${end}`,
  );
  return result.episodes ?? [];
}

export function getAnimeTitle(anime: Anime): string {
  return anime.English || anime.title || anime.Japanese || 'Untitled anime';
}

export function getAnimeSlug(anime: Anime): string | undefined {
  return anime.slug || anime.slugs?.find((slug): slug is string => !!slug);
}

export function unwrapFeatured(
  featured: HomeCollection['featured'],
): Anime[] {
  return (featured ?? [])
    .map((item) => ('anime' in item ? item.anime : item))
    .filter((anime): anime is Anime => !!anime);
}
