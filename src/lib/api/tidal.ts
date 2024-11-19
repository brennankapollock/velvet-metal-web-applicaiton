const TIDAL_CLIENT_ID = import.meta.env.VITE_TIDAL_CLIENT_ID;
const TIDAL_CLIENT_SECRET = import.meta.env.VITE_TIDAL_CLIENT_SECRET;
const TIDAL_REDIRECT_URI = import.meta.env.VITE_TIDAL_REDIRECT_URI;

if (!TIDAL_CLIENT_ID || !TIDAL_CLIENT_SECRET) {
  console.error('Missing Tidal credentials:', {
    hasClientId: !!TIDAL_CLIENT_ID,
    hasClientSecret: !!TIDAL_CLIENT_SECRET,
  });
}

async function generateCodeChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  console.log('Code Verifier Length:', codeVerifier.length); // Should be 64

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)));
  const codeChallenge = base64Digest
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('Code Challenge Length:', codeChallenge.length); // Should be 43

  return {
    codeVerifier,
    codeChallenge,
  };
}

export async function getTidalAuthUrl() {
  const { codeVerifier, codeChallenge } = await generateCodeChallenge();
  localStorage.setItem('tidal_code_verifier', codeVerifier);

  // Try minimal required parameters
  const minimalParams = new URLSearchParams({
    response_type: 'code',
    client_id: TIDAL_CLIENT_ID,
    redirect_uri: TIDAL_REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://login.tidal.com/authorize?${minimalParams.toString()}`;
}

export async function refreshTidalToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: TIDAL_CLIENT_ID,
    client_secret: TIDAL_CLIENT_SECRET,
  });

  const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(
        `${TIDAL_CLIENT_ID}:${TIDAL_CLIENT_SECRET}`
      )}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Tidal token');
  }

  return response.json();
}

export async function getTidalAccessToken(code: string) {
  const codeVerifier = localStorage.getItem('tidal_code_verifier');
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: TIDAL_CLIENT_ID,
    code: code,
    redirect_uri: TIDAL_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Tidal token error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
    });
    throw new Error(
      errorData.error_description || 'Failed to get Tidal access token'
    );
  }

  const data = await response.json();
  return data;
}

export async function getTidalPlaylists(accessToken: string) {
  const response = await fetch(
    'https://api.tidal.com/v1/me/favorites/playlists',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Tidal playlists');
  }

  return response.json();
}

export async function getTidalAlbums(accessToken: string) {
  const response = await fetch('https://api.tidal.com/v1/me/albums', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Tidal albums');
  }

  const data = await response.json();
  return { items: data.items }; // Match Spotify's format for consistency
}
