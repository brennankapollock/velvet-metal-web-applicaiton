import { z } from 'zod';
import { getServiceAuth, saveServiceAuth, removeServiceAuth } from '@/lib/services/streaming-auth';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

export interface SpotifyAuth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function handleSpotifyRequest<T>(
  accessToken: string,
  requestFn: (token: string) => Promise<T>,
  userId?: string
): Promise<T> {
  const makeRequest = async (token: string) => {
    try {
      return await requestFn(token);
    } catch (error) {
      // Check if the error is due to an expired token
      if (error instanceof Error && 'status' in error && (error as any).status === 401) {
        if (!userId) {
          throw new Error('User ID is required for token refresh');
        }

        // Get the current auth data
        const currentAuth = await getServiceAuth(userId, 'spotify');
        if (!currentAuth?.refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          // Attempt to refresh the token
          console.log('Token expired, attempting refresh...');
          const newAuth = await refreshSpotifyToken(currentAuth.refreshToken);
          
          // Save the new tokens
          await saveServiceAuth(userId, 'spotify', {
            accessToken: newAuth.accessToken,
            refreshToken: newAuth.refreshToken,
            expiresAt: new Date(Date.now() + newAuth.expiresIn * 1000),
          });

          // Retry the request with the new token
          console.log('Token refreshed, retrying request...');
          return await requestFn(newAuth.accessToken);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Failed to refresh access token');
        }
      }
      
      // Ensure error is properly formatted with status code if it's a fetch error
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        error.message = `Spotify API error (${status}): ${error.message}`;
      }
      throw error;
    }
  };

  try {
    if (typeof accessToken !== 'string') {
      console.error('Invalid access token type:', typeof accessToken);
      throw new Error('Invalid access token type');
    }
    
    if (!accessToken) {
      console.error('Access token is empty');
      throw new Error('Access token is required');
    }

    console.log('Making Spotify API request with token:', accessToken.slice(0, 10) + '...');
    return await makeRequest(accessToken);
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

export function getSpotifyAuthUrl() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
    throw new Error('Missing Spotify environment variables');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: [
      'user-library-read',
      'user-library-modify',
      'user-read-private',
      'user-read-email',
    ].join(' '),
    redirect_uri: SPOTIFY_REDIRECT_URI,
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getSpotifyToken(code: string): Promise<SpotifyAuth> {
  console.log('Getting Spotify token with code:', code);
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    throw new Error('Missing Spotify environment variables');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  console.log('Making token request with params:', params.toString());
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        )}`,
      },
      body: params,
    });

    console.log('Token response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token request failed:', errorText);
      throw new Error(`Failed to get Spotify token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Token response parsed successfully');

    if (!data.access_token) {
      console.error('Missing access token in response:', data);
      throw new Error('Invalid token response from Spotify');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('Failed to get Spotify token:', error);
    throw error;
  }
}

export async function refreshSpotifyToken(
  refreshToken: string
): Promise<SpotifyAuth> {
  console.log('Starting Spotify token refresh...');
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('Missing environment variables:', {
      hasClientId: !!SPOTIFY_CLIENT_ID,
      hasClientSecret: !!SPOTIFY_CLIENT_SECRET,
    });
    throw new Error('Missing Spotify environment variables');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });

  try {
    console.log('Making refresh token request to Spotify...');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        )}`,
      },
      body: params,
    });

    console.log('Received response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response:', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      });
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error('Invalid JSON response from Spotify');
    }

    try {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (parseError) {
      console.error('Schema validation failed:', parseError);
      throw new Error('Invalid token response from Spotify');
    }
  } catch (error) {
    console.error('Token refresh request failed:', error);
    throw error;
  }
}

export async function getSpotifyPlaylists(accessToken: string, userId: string) {
  return handleSpotifyRequest(accessToken, async (token) => {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch playlists: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data?.items)) {
      console.error('Invalid playlist response:', data);
      throw new Error('Invalid playlist response from Spotify');
    }

    return data.items.map((item: any) => ({
      playlist_id: item.id,
      name: item.name || 'Untitled Playlist',
      description: item.description || '',
      artwork: item.images?.[0] ? {
        url: item.images[0].url,
        height: item.images[0].height || null,
        width: item.images[0].width || null,
      } : null,
      tracks_count: item.tracks?.total || 0,
      owner: item.owner ? {
        id: item.owner.id || null,
        display_name: item.owner.display_name || null,
      } : null,
      is_public: Boolean(item.public),
      external_url: item.external_urls?.spotify || null
    }));
  }, userId);
}

export async function getSpotifyAlbums(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get Spotify albums:', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Failed to get Spotify albums: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data?.items || !Array.isArray(data.items)) {
    console.error('Invalid album response:', data);
    throw new Error('Invalid album response from Spotify');
  }

  return data;
}

export async function getMoreSpotifyAlbums(
  nextUrl: string,
  accessToken: string
) {
  const response = await fetch(nextUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get more Spotify albums:', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Failed to get more Spotify albums: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data?.items || !Array.isArray(data.items)) {
    console.error('Invalid album response:', data);
    throw new Error('Invalid album response from Spotify');
  }

  return data;
}

export async function getAllSpotifyAlbums(
  userId: string,
  accessToken: string,
  onProgress?: (current: number, total: number) => void
) {
  try {
    let allAlbums = [];
    let nextUrl = null;
    let total = 0;
    let current = 0;

    // Get first page
    const firstPage = await getSpotifyAlbums(accessToken);
    if (firstPage.items) {
      allAlbums = [...firstPage.items];
      nextUrl = firstPage.next;
      total = firstPage.total || 0;
      current = allAlbums.length;
      onProgress?.(current, total);
    }

    // Get remaining pages
    while (nextUrl) {
      const nextPage = await getMoreSpotifyAlbums(nextUrl, accessToken);
      if (nextPage.items) {
        allAlbums = [...allAlbums, ...nextPage.items];
        nextUrl = nextPage.next;
        current = allAlbums.length;
        onProgress?.(current, total);
      }
    }

    // Process albums
    return allAlbums.map((item: any) => {
      const album = item.album || item;
      return {
        album_id: album?.id,
        name: album?.name || 'Untitled Album',
        artist_name: album?.artists?.map((artist: any) => artist.name || 'Unknown Artist').join(', ') || 'Unknown Artist',
        image_url: album?.images?.[0]?.url || null,
        release_date: album?.release_date || null,
        tracks_count: album?.total_tracks || 0,
        external_url: album?.external_urls?.spotify || null,
        album_type: album?.album_type?.toLowerCase() || 'album'
      };
    });
  } catch (error) {
    console.error('Failed to get all Spotify albums:', error);
    throw error;
  }
}

export async function getSpotifyAlbumDetails(
  userId: string,
  albumId: string,
  accessToken: string
) {
  return handleSpotifyRequest(accessToken, async (token) => {
    const [albumResponse, tracksResponse] = await Promise.all([
      fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    if (!albumResponse.ok || !tracksResponse.ok) {
      const error = new Error(`Failed to get Spotify album details: ${albumResponse.status}`);
      (error as any).status = albumResponse.status;
      throw error;
    }

    const [album, tracks] = await Promise.all([
      albumResponse.json(),
      tracksResponse.json(),
    ]);

    return {
      id: album.id,
      name: album.name,
      artists: album.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      artwork: {
        url: album.images[0]?.url,
        width: album.images[0]?.width,
        height: album.images[0]?.height,
      },
      tracks: tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        trackNumber: track.track_number,
        durationMs: track.duration_ms,
        artists: track.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
        })),
        previewUrl: track.preview_url,
      })),
    };
  }, userId);
}

export async function getSpotifyPlaylistDetails(
  playlistId: string,
  accessToken: string,
  userId?: string
) {
  console.log('Getting playlist details for:', playlistId);

  return handleSpotifyRequest(
    accessToken,
    async (token) => {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = new Error('Failed to fetch playlist details');
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    },
    userId
  );
}
