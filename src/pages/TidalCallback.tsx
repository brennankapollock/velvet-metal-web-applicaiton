import { useAuth } from '@/contexts/auth-context';
import { syncLibrary } from '@/lib/services/librarySync';
import updateConnectedServices from '@/lib/services/updateConnectedServices';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getTidalAccessToken } from '../lib/api/tidal';
export default function TidalCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');

      if (!code || isProcessing || !user) {
        return;
      }

      setIsProcessing(true);
      const progressToast = toast.loading('Connecting to Tidal...', {
        duration: Infinity,
      });

      try {
        const tokenData = await getTidalAccessToken(code);

        if (tokenData.access_token && tokenData.refresh_token) {
          // Store the tokens
          localStorage.setItem('tidal_access_token', tokenData.access_token);
          localStorage.setItem('tidal_refresh_token', tokenData.refresh_token);
          localStorage.setItem(
            'tidal_token_expires_at',
            String(Math.floor(Date.now() / 1000 + tokenData.expires_in))
          );

          // Update connected services
          await updateConnectedServices(user.id, {
            id: 'tidal',
            name: 'Tidal',
            connected: true,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000 + tokenData.expires_in),
          });

          // Sync library
          await syncLibrary(user.id, 'tidal', (progress) => {
            toast.loading(
              `${
                progress.phase === 'albums'
                  ? 'Syncing Albums'
                  : 'Syncing Playlists'
              }: ${progress.current}/${progress.total}`,
              { id: progressToast }
            );
          });

          toast.success('Successfully connected to Tidal!', {
            id: progressToast,
          });

          navigate('/library');
        } else {
          throw new Error('Invalid token data received');
        }
      } catch (error) {
        console.error('Failed to connect to Tidal:', error);
        toast.error('Failed to connect to Tidal', { id: progressToast });
        navigate('/');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, isProcessing, user]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p>Connecting to Tidal...</p>
        {isProcessing && <p>Processing authentication...</p>}
      </div>
    </div>
  );
}
