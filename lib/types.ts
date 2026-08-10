// Station shape returned by our /api/stations route — a filtered subset of
// what Radio Browser returns. `streamUrl` is always the resolved, playable URL.
export interface Station {
  uuid: string;
  name: string;
  streamUrl: string;
  homepage: string;
  favicon: string;
  tags: string[];
  countryCode: string;
  country: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: boolean;
  clickCount: number;
  clickTrend: number;
  geoLat: number | null;
  geoLong: number | null;
}

// Raw Radio Browser API station record (fields we read).
export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  countrycode: string;
  country: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  clickcount: number;
  clicktrend: number;
  geo_lat: number | null;
  geo_long: number | null;
}

export interface StationSearchParams {
  name?: string;
  tagList?: string;
  countrycode?: string;
  language?: string;
  bitrateMin?: number;
  order?: "clickcount" | "clicktrend" | "bitrate" | "votes" | "name";
  reverse?: boolean;
  limit?: number;
  offset?: number;
}

export interface TagEntry {
  name: string;
  stationcount: number;
}

export interface CountryEntry {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}

export interface LanguageEntry {
  name: string;
  iso_639: string | null;
  stationcount: number;
}
