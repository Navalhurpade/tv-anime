const API_BASE_URL = 'https://animehot.cc/api';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function getHome(): Promise<HomeCollection> {
  return request<HomeCollection>('/home?slugNth=10&includeSlugs=false');
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
