import { saveServiceAuth, removeServiceAuth } from './streaming-auth';

export async function authorizeSpotify(userId: string) {
  try {
    console.log('Starting Spotify authorization...', { userId });
    
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    if (!clientId) {
      throw new Error('Spotify client ID not found in environment variables');
    }
    if (!redirectUri) {
      throw new Error('Spotify redirect URI not found in environment variables');
    }

    const scope = [
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state: userId,
      show_dialog: 'true', // Always show the auth dialog
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('Redirecting to Spotify authorization page:', {
      clientId,
      redirectUri,
      scope,
      authUrl,
    });
    
    window.location.href = authUrl;
  } catch (error) {
    console.error('Failed to start Spotify authorization:', error);
    throw error;
  }
}

export async function unauthorizeSpotify(userId: string) {
  try {
    console.log('Removing Spotify authorization...');
    await removeServiceAuth(userId, 'spotify');
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    console.log('Spotify authorization removed successfully');
  } catch (error) {
    console.error('Failed to remove Spotify authorization:', error);
    throw error;
  }
}

export async function handleSpotifyCallback(code: string, userId: string) {
  try {
    console.log('Handling Spotify callback...');
    
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not found in environment variables');
    }
    if (!redirectUri) {
      throw new Error('Spotify redirect URI not found in environment variables');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify tokens: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received Spotify tokens');

    // Save tokens
    await saveServiceAuth(userId, 'spotify', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    });

    // Store tokens in localStorage for easy access
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_refresh_token', data.refresh_token);

    console.log('Spotify authorization completed successfully');
    return data;
  } catch (error) {
    console.error('Failed to handle Spotify callback:', error);
    throw error;
  }
}

export async function refreshSpotifyToken(userId: string, refreshToken: string) {
  try {
    console.log('Refreshing Spotify token...');
    
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not found in environment variables');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received new Spotify tokens');

    // Save new tokens
    await saveServiceAuth(userId, 'spotify', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use old refresh token if new one not provided
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    });

    // Update localStorage
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }

    console.log('Spotify token refresh completed successfully');
    return data;
  } catch (error) {
    console.error('Failed to refresh Spotify token:', error);
    throw error;
  }
}
