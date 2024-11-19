import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { authorizeAppleMusic } from '@/lib/api/apple-music';
import { getSpotifyAuthUrl } from '@/lib/api/spotify';
import { getTidalAuthUrl } from '@/lib/api/tidal';
import pb from '@/lib/pocketbase';
import { syncLibrary } from '@/lib/services/librarySync';
import updateConnectedServices from '@/lib/services/updateConnectedServices';
import { useQuery } from '@tanstack/react-query';
import { Check, Music, Music2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Home() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const { data: userServices, refetch: refetchServices } = useQuery({
    queryKey: ['userServices', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const record = await pb.collection('users').getOne(user.id);
      return record.connectedServices || [];
    },
    enabled: !!user,
  });

  const isSpotifyConnected = userServices?.some(
    (service) => service.id === 'spotify' && service.connected
  );

  const isAppleMusicConnected = userServices?.some(
    (service) => service.id === 'apple-music' && service.connected
  );

  const isTidalConnected = useMemo(() => {
    return userServices?.some(
      (service: any) => service.id === 'tidal' && service.connected
    );
  }, [userServices]);

  const handleSpotifyConnect = () => {
    window.location.href = getSpotifyAuthUrl();
  };

  const handleAppleMusicConnect = async () => {
    try {
      const auth = await authorizeAppleMusic();
      localStorage.setItem('apple_music_token', auth.musicUserToken);

      await updateConnectedServices(user.id, {
        id: 'apple-music',
        name: 'Apple Music',
        connected: true,
        accessToken: auth.musicUserToken,
        userToken: auth.userToken,
        expiresAt: null,
      });

      await refetchServices();
      toast.success('Successfully connected to Apple Music');
      await syncLibrary(user.id, 'apple-music');
      navigate('/library');
    } catch (error) {
      console.error('Apple Music authorization failed:', error);
      toast.error('Failed to connect to Apple Music');
    }
  };

  const handleTidalConnect = async () => {
    const authUrl = await getTidalAuthUrl();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-accent/10">
      <div className="container mx-auto max-w-5xl space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight">
              Welcome {user?.name}
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect your music services to get started
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="hover:bg-accent text-foreground"
          >
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Music className="h-7 w-7" />
                Spotify
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[100px]">
              {isSpotifyConnected ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Connected to Spotify</span>
                </div>
              ) : (
                <Button
                  onClick={handleSpotifyConnect}
                  className="relative w-full max-w-[200px] overflow-hidden bg-gradient-to-r from-green-500 to-green-600 transition-transform hover:scale-[1.02] px-8 py-6"
                >
                  <span className="relative z-10">Connect</span>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Music2 className="h-7 w-7" />
                Apple Music
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[100px]">
              {isAppleMusicConnected ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Connected to Apple Music</span>
                </div>
              ) : (
                <Button
                  onClick={handleAppleMusicConnect}
                  className="relative w-full max-w-[200px] overflow-hidden bg-gradient-to-r from-pink-500 to-pink-600 transition-transform hover:scale-[1.02] px-8 py-6"
                >
                  <span className="relative z-10">Connect</span>
                </Button>
              )}
            </CardContent>
          </Card>
          <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Music className="h-7 w-7" />
                Tidal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[100px]">
              {isTidalConnected ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Connected to Tidal</span>
                </div>
              ) : (
                <Button
                  onClick={handleTidalConnect}
                  className="relative w-full max-w-[200px] overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 transition-transform hover:scale-[1.02] px-8 py-6"
                >
                  <span className="relative z-10">Connect</span>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
