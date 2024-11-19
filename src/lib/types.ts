export type ServiceType = 'spotify' | 'apple-music' | 'tidal';
export type ViewMode = 'grid' | 'list';

export interface UserAlbums {
  user: string; // Relation to users collection
  service: ServiceType;
  albums: Album[]; // Store the full album data
  lastSynced: Date;
}

export interface UserPlaylists {
  user: string; // Relation to users collection
  service: ServiceType;
  playlists: Playlist[]; // Store the full playlist data
  lastSynced: Date;
}
// THE FINAL ALBUM TYPE
export interface NormalizedAlbum {
  id: string;
  name: string;
  artistName: string;
  artwork: {
    url: string;
    width?: number;
    height?: number;
  };
  releaseDate: string;
  trackCount: number;
  dateAdded?: string;
  sourceService: ServiceType;
  sourceId: string;
}

export interface NormalizedPlaylist {
  id: string;
  sourceId: string;
  sourceService: ServiceType;
  name: string;
  artwork: {
    url: string;
    width: number | null;
    height: number | null;
  };
  trackCount: number;
  dateAdded: string | null;
}

export interface AlbumTrack {
  id: string;
  name: string;
  trackNumber: number;
  durationMs: number;
  artistName: string;
  previewUrl?: string;
}

export interface DetailedAlbum extends NormalizedAlbum {
  tracks: AlbumTrack[];
  totalTracks: number;
  genres: string[];
  popularity?: number;
  copyrights?: string[];
  label?: string;
}

export interface Album {
  id: string;
  album?: {
    name: string;
    images?: { url: string }[];
    artists?: { name: string }[];
    release_date?: string;
    total_tracks?: number;
  };
  attributes?: {
    name: string;
    artwork?: { url: string };
    artistName?: string;
    releaseDate?: string;
    trackCount?: number;
  };
}

export interface Playlist {
  id: string;
  name?: string;
  images?: { url: string }[];
  attributes?: {
    name: string;
    artwork?: { url: string };
    trackCount?: number;
  };
  tracks?: {
    total?: number;
  };
}

export interface Track {
  name: string;
  artist: string;
  album: string;
  isrc?: string;
}

export interface SyncProgress {
  total: number;
  current: number;
  phase: 'albums' | 'playlists';
  service: ServiceType;
}
