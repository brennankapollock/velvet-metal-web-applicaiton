import {
  getAppleMusicAlbums,
  getAppleMusicLibrary,
} from '@/lib/api/apple-music';
import { getAllSpotifyAlbums, getSpotifyPlaylists } from '@/lib/api/spotify';
import pb from '@/lib/pocketbase';
import {
  NormalizedAlbum,
  NormalizedPlaylist,
  ServiceType,
  SyncProgress,
} from '@/lib/types';
import { getTidalAlbums, getTidalPlaylists } from '../api/tidal';

function normalizeAlbumData(album: any, service: ServiceType): NormalizedAlbum {
  if (service === 'spotify') {
    return {
      id: album.album?.id || album.id,
      sourceId: album.album?.id || album.id,
      sourceService: 'spotify',
      name: album.album?.name || '',
      artistName: album.album?.artists?.[0]?.name || '',
      artwork: {
        url: album.album?.images?.[0]?.url || '',
        width: album.album?.images?.[0]?.width || null,
        height: album.album?.images?.[0]?.height || null,
      },
      releaseDate: album.album?.release_date || '',
      trackCount: album.album?.total_tracks || 0,
      dateAdded: album.added_at || null,
    };
  } else if (service === 'apple-music') {
    // Apple Music
    const artworkUrl = album.attributes?.artwork?.url
      ? album.attributes.artwork.url
          .replace('{w}', '1200')
          .replace('{h}', '1200')
      : '';

    return {
      id: album.id,
      sourceId: album.id,
      sourceService: 'apple-music',
      name: album.attributes?.name || '',
      artistName: album.attributes?.artistName || '',
      artwork: {
        url: artworkUrl,
        width: album.attributes?.artwork?.width || null,
        height: album.attributes?.artwork?.height || null,
      },
      releaseDate: album.attributes?.releaseDate || '',
      trackCount: album.attributes?.trackCount || 0,
      dateAdded: album.attributes?.dateAdded || null,
    };
  } else {
    // Tidal
    return {
      id: album.item.id.toString(),
      sourceId: album.item.id.toString(),
      sourceService: 'tidal',
      name: album.item.title || '',
      artistName: album.item.artists?.[0]?.name || '',
      artwork: {
        url: album.item.cover || '',
        width: 1280,
        height: 1280,
      },
      releaseDate: album.item.releaseDate || '',
      trackCount: album.item.numberOfTracks || 0,
      dateAdded: album.created || null,
    };
  }
}

export function normalizePlaylistData(
  playlist: any,
  service: ServiceType
): NormalizedPlaylist {
  if (service === 'spotify') {
    return {
      id: playlist.id,
      sourceId: playlist.id,
      sourceService: 'spotify',
      name: playlist.name || 'Untitled Playlist',
      artwork: {
        url: playlist.images?.[0]?.url || '',
        width: playlist.images?.[0]?.width || null,
        height: playlist.images?.[0]?.height || null,
      },
      trackCount: playlist.tracks?.total || 0,
      dateAdded: playlist.added_at || null,
    };
  } else if (service === 'apple-music') {
    // Apple Music
    const artworkUrl = playlist.attributes?.artwork?.url
      ? playlist.attributes.artwork.url
          .replace('{w}', '500')
          .replace('{h}', '500')
      : '';

    return {
      id: playlist.id,
      sourceId: playlist.id,
      sourceService: 'apple-music',
      name: playlist.attributes?.name || 'Untitled Playlist',
      artwork: {
        url: artworkUrl,
        width: playlist.attributes?.artwork?.width || null,
        height: playlist.attributes?.artwork?.height || null,
      },
      trackCount: playlist.attributes?.trackCount || 0,
      dateAdded: playlist.attributes?.dateAdded || null,
    };
  } else {
    // Tidal
    return {
      id: playlist.uuid,
      sourceId: playlist.uuid,
      sourceService: 'tidal',
      name: playlist.title || 'Untitled Playlist',
      artwork: {
        url: playlist.image || '',
        width: null,
        height: null,
      },
      trackCount: playlist.numberOfTracks || 0,
      dateAdded: playlist.created || null,
    };
  }
}

export async function syncLibrary(
  userId: string,
  service: ServiceType,
  onProgress?: (progress: SyncProgress) => void
) {
  const token = localStorage.getItem(
    service === 'spotify'
      ? 'spotify_access_token'
      : service === 'apple-music'
      ? 'apple_music_token'
      : 'tidal_access_token'
  );

  console.log('Syncing Library for User:', userId, 'With Service:', service);

  if (!token) throw new Error('No access token found');

  try {
    onProgress?.({
      total: 0,
      current: 0,
      phase: 'albums',
      service,
    });
    let albums;
    if (service === 'spotify') {
      albums = { items: await getAllSpotifyAlbums(userId, token) };
    } else if (service === 'apple-music') {
      albums = await getAppleMusicAlbums(token);
    } else {
      albums = await getTidalAlbums(token);
    }

    onProgress?.({
      total: 100,
      current: 0,
      phase: 'playlists',
      service,
    });

    // Fetch All Playlists
    const playlists =
      service === 'spotify'
        ? await getSpotifyPlaylists(token)
        : service === 'apple-music'
        ? await getAppleMusicLibrary(token)
        : await getTidalPlaylists(token);

    console.log('Fetched Data:', {
      albumsCount: albums?.items?.length || 0,
      playlistsCount: playlists?.items?.length || 0,
    });

    // Try to find existing records
    let albumsRecord;
    let playlistsRecord;

    try {
      albumsRecord = await pb
        .collection('userAlbums')
        .getFirstListItem(`user="${userId}" && service="${service}"`);
    } catch (error) {
      console.log('No existing albums record found, will create new');
    }

    try {
      playlistsRecord = await pb
        .collection('userPlaylists')
        .getFirstListItem(`user="${userId}" && service="${service}"`);
    } catch (error) {
      console.log('No existing playlists record found, will create new');
    }

    const now = new Date().toISOString();

    // Prepare the data in the correct format
    const albumsData = {
      user: userId,
      service,
      albums:
        service === 'spotify' || service === 'tidal'
          ? albums.items
          : albums.data,
      lastSynced: now,
    };

    const playlistsData = {
      user: userId,
      service,
      playlists:
        service === 'spotify' || service === 'tidal'
          ? playlists.items
          : playlists.data,
      lastSynced: now,
    };

    console.log('Saving to PocketBase:', {
      albumsDataCount: albumsData.albums?.length || 0,
      playlistsDataCount: playlistsData.playlists?.length || 0,
    });

    // Update or create records with a small delay to prevent auto-cancellation
    if (albumsRecord) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pb.collection('userAlbums').update(albumsRecord.id, albumsData);
      console.log('Updated existing albums record');
    } else {
      const created = await pb.collection('userAlbums').create(albumsData);
      console.log('Created new albums record:', created.id);
    }

    if (playlistsRecord) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await pb
        .collection('userPlaylists')
        .update(playlistsRecord.id, playlistsData);
      console.log('Updated existing playlists record');
    } else {
      const created = await pb
        .collection('userPlaylists')
        .create(playlistsData);
      console.log('Created new playlists record:', created.id);
    }

    return { albums, playlists };
  } catch (error) {
    console.error('Failed to sync library:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

export async function getStoredLibrary(userId: string, service: ServiceType) {
  try {
    let albumsRecord = null;
    let playlistsRecord = null;

    console.log('Fetching albums and playlists for user:', userId);

    try {
      albumsRecord = await pb
        .collection('userAlbums')
        .getFirstListItem(`user="${userId}" && service="${service}"`);

      console.log('Albums Record Found:', albumsRecord);
    } catch (error) {
      albumsRecord = { albums: [], lastSynced: new Date() };
    }

    try {
      playlistsRecord = await pb
        .collection('userPlaylists')
        .getFirstListItem(`user="${userId}" && service="${service}"`);
    } catch (error) {
      playlistsRecord = { playlists: [] };
    }

    return {
      albums: albumsRecord.albums || [],
      playlists: playlistsRecord.playlists || [],
      lastSynced: albumsRecord.lastSynced,
    };
  } catch (error) {
    console.error('Error in getStoredLibrary:', error);
    return {
      albums: [],
      playlists: [],
      lastSynced: new Date(),
    };
  }
}
