import "server-only";
import type {
  CountryEntry,
  LanguageEntry,
  RadioBrowserStation,
  Station,
  StationSearchParams,
  TagEntry,
} from "./types";

// Radio Browser is a community-funded API. They ask for a descriptive
// User-Agent, and all calls go through our route handlers so caching and
// filtering happen in one place.
const USER_AGENT = "static-radio/0.1 (+https://static.enbasis.com)";

const FALLBACK_MIRRORS = [
  "de1.api.radio-browser.info",
  "de2.api.radio-browser.info",
  "at1.api.radio-browser.info",
  "nl1.api.radio-browser.info",
];

const MIRROR_LIST_TTL_MS = 60 * 60 * 1000; // re-resolve mirrors hourly

let mirrors: string[] = FALLBACK_MIRRORS;
let mirrorsResolvedAt = 0;
// Index of the mirror that last worked; failover advances it.
let activeMirror = 0;

let resolving: Promise<void> | null = null;

// Never blocks a request: callers get the current list (fallbacks on a cold
// server) immediately, while the real mirror list refreshes in the background.
// Blocking here cost up to 5s on every cold start.
function resolveMirrors(): string[] {
  const now = Date.now();
  if (now - mirrorsResolvedAt >= MIRROR_LIST_TTL_MS && !resolving) {
    resolving = fetch("https://all.api.radio-browser.info/json/servers", {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const servers = (await res.json()) as { name: string }[];
        const names = [...new Set(servers.map((s) => s.name))];
        if (names.length > 0) {
          mirrors = names;
          mirrorsResolvedAt = Date.now();
        }
      })
      .catch(() => {
        // Keep whatever list we have; fallbacks cover the cold-start case.
      })
      .finally(() => {
        resolving = null;
      });
  }
  return mirrors;
}

// Fetch `path` from the active mirror, failing over to the next on error.
// `revalidate` drives Next's fetch cache: 24h for tag/country lists, 5m for
// search results, so we aren't hammering a donation-funded API.
async function rbFetch<T>(path: string, revalidate: number): Promise<T> {
  const list = resolveMirrors();
  let lastError: unknown;
  for (let attempt = 0; attempt < list.length; attempt++) {
    const host = list[(activeMirror + attempt) % list.length];
    try {
      const res = await fetch(`https://${host}${path}`, {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      const data = (await res.json()) as T;
      activeMirror = (activeMirror + attempt) % list.length;
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`All Radio Browser mirrors failed: ${String(lastError)}`);
}

const streamProxyEnabled = () => Boolean(process.env.STREAM_PROXY_URL);

function toStation(raw: RadioBrowserStation): Station {
  return {
    uuid: raw.stationuuid,
    name: raw.name.trim(),
    // Always url_resolved — `url` may be a playlist wrapper or redirect.
    streamUrl: raw.url_resolved,
    homepage: raw.homepage,
    favicon: raw.favicon,
    tags: raw.tags
      ? raw.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    countryCode: raw.countrycode,
    country: raw.country,
    state: raw.state,
    language: raw.language,
    votes: raw.votes,
    codec: raw.codec,
    bitrate: raw.bitrate,
    hls: raw.hls === 1,
    clickCount: raw.clickcount,
    clickTrend: raw.clicktrend,
    geoLat: raw.geo_lat,
    geoLong: raw.geo_long,
  };
}

// Static is a music radio app. The directory has no "music" flag, so this is
// a tag heuristic: a station is dropped when it carries a clearly non-music
// tag (or name) and no recognisable music genre alongside it. Mixed-format
// stations (news + pop + rock) stay in.
const NON_MUSIC_TAGS = new Set([
  "news",
  "talk",
  "talk radio",
  "news talk",
  "sport",
  "sports",
  "info",
  "information",
  "politics",
  "commercial",
  "comedy",
  "documentary",
  "education",
  "weather",
  "traffic",
  "noticias",
  "deportes",
  "nachrichten",
  "actualites",
  "actualités",
  "haber",
  "spor",
]);

const MUSIC_TAGS = new Set([
  "music",
  "pop",
  "rock",
  "jazz",
  "classical",
  "dance",
  "electronic",
  "house",
  "techno",
  "trance",
  "hits",
  "oldies",
  "60s",
  "70s",
  "80s",
  "90s",
  "00s",
  "hip-hop",
  "hip hop",
  "hiphop",
  "rap",
  "r&b",
  "rnb",
  "soul",
  "funk",
  "metal",
  "indie",
  "alternative",
  "chillout",
  "lounge",
  "ambient",
  "country",
  "folk",
  "latin",
  "reggae",
  "reggaeton",
  "salsa",
  "blues",
  "disco",
  "edm",
  "top 40",
  "top40",
  "schlager",
  "adult contemporary",
  "classic rock",
  "smooth jazz",
  "hard rock",
  "punk",
  "gospel",
  "world music",
  "kpop",
  "k-pop",
  "j-pop",
  "anime",
  "bollywood",
  "instrumental",
  "piano",
  "opera",
  "symphony",
  "eurodance",
  "italo disco",
  "drum and bass",
  "dubstep",
  "grunge",
  "ska",
  "swing",
  "bossa nova",
  "flamenco",
  "tango",
  "mariachi",
  "cumbia",
  "afrobeat",
  "amapiano",
  "arabic music",
  "christmas",
]);

const NON_MUSIC_NAME = /\b(news|talk|sport|noticias|deportes)\b/i;

function looksLikeMusic(raw: RadioBrowserStation): boolean {
  const tags = raw.tags
    ? raw.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const hasMusic = tags.some((t) => MUSIC_TAGS.has(t) || t.includes("music"));
  const hasNonMusic = tags.some((t) => NON_MUSIC_TAGS.has(t));
  if (hasNonMusic && !hasMusic) return false;
  if (!hasNonMusic && NON_MUSIC_NAME.test(raw.name) && !hasMusic) return false;
  return true;
}

// Filtering rules, in order. `unhealthy` is the set of station UUIDs with 3+
// recorded failures in the last 7 days (empty until the community layer ships).
export function filterStations(
  raw: RadioBrowserStation[],
  unhealthy: ReadonlySet<string> = new Set(),
): Station[] {
  const seenNames = new Set<string>();
  const out: Station[] = [];
  for (const s of raw) {
    if (s.lastcheckok !== 1) continue;
    if (!s.url_resolved) continue;
    // An HTTPS page cannot play an http:// stream — the browser blocks it as
    // mixed content and it fails silently. Drop unless the proxy can rescue it.
    if (s.url_resolved.startsWith("http://") && !streamProxyEnabled()) continue;
    if (unhealthy.has(s.stationuuid)) continue;
    if (!looksLikeMusic(s)) continue;
    const nameKey = s.name.trim().toLowerCase();
    if (!nameKey || seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    out.push(toStation(s));
  }
  return out;
}

function buildSearchQs(params: StationSearchParams, override?: { name?: string; tag?: string }) {
  const qs = new URLSearchParams({
    hidebroken: "true",
    order: params.order ?? "clickcount",
    reverse: String(params.reverse ?? true),
    limit: String(params.limit ?? 400),
  });
  if (params.offset) qs.set("offset", String(params.offset));
  if (override?.name ?? params.name) qs.set("name", override?.name ?? params.name ?? "");
  if (override?.tag) qs.set("tag", override.tag);
  if (params.tagList) qs.set("tagList", params.tagList);
  if (params.countrycode) qs.set("countrycode", params.countrycode);
  if (params.language) qs.set("language", params.language);
  if (params.bitrateMin) qs.set("bitrateMin", String(params.bitrateMin));
  return qs.toString();
}

const ORDER_FIELD: Record<string, keyof RadioBrowserStation> = {
  clickcount: "clickcount",
  clicktrend: "clicktrend",
  votes: "votes",
  bitrate: "bitrate",
};

export async function searchStations(params: StationSearchParams): Promise<Station[]> {
  // A free-text query should find genres too: "techno" means techno stations,
  // not just stations named techno. Run name and tag searches in parallel
  // (both cached) and merge, name matches first among equals.
  if (params.name && !params.tagList) {
    const [byName, byTag] = await Promise.all([
      rbFetch<RadioBrowserStation[]>(`/json/stations/search?${buildSearchQs(params)}`, 300),
      rbFetch<RadioBrowserStation[]>(
        `/json/stations/search?${buildSearchQs({ ...params, name: undefined }, { tag: params.name })}`,
        300,
      ).catch(() => [] as RadioBrowserStation[]),
    ]);
    const seen = new Set<string>();
    const merged: RadioBrowserStation[] = [];
    for (const s of [...byName, ...byTag]) {
      if (seen.has(s.stationuuid)) continue;
      seen.add(s.stationuuid);
      merged.push(s);
    }
    const field = ORDER_FIELD[params.order ?? "clickcount"];
    if (field) {
      merged.sort((a, b) => (b[field] as number) - (a[field] as number));
    } else if (params.order === "name") {
      merged.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filterStations(merged);
  }

  const raw = await rbFetch<RadioBrowserStation[]>(
    `/json/stations/search?${buildSearchQs(params)}`,
    300, // search results: 5 minutes
  );
  return filterStations(raw);
}

export async function getTags(): Promise<TagEntry[]> {
  const tags = await rbFetch<TagEntry[]>(
    "/json/tags?order=stationcount&reverse=true&limit=300&hidebroken=true",
    86400, // 24h
  );
  // The genre picker should only offer music genres.
  return tags.filter((t) => !NON_MUSIC_TAGS.has(t.name.trim().toLowerCase()));
}

export async function getCountries(): Promise<CountryEntry[]> {
  return rbFetch<CountryEntry[]>(
    "/json/countries?order=stationcount&reverse=true&hidebroken=true",
    86400,
  );
}

export async function getLanguages(): Promise<LanguageEntry[]> {
  return rbFetch<LanguageEntry[]>(
    "/json/languages?order=stationcount&reverse=true&limit=200&hidebroken=true",
    86400,
  );
}

// Tell the directory a stream connected successfully. This is how Radio
// Browser learns which streams are alive — fire on every successful connect.
export async function registerClick(stationUuid: string): Promise<void> {
  try {
    await rbFetch(`/json/url/${encodeURIComponent(stationUuid)}`, 0);
  } catch {
    // Click registration is best-effort; never surface a failure to the user.
  }
}
