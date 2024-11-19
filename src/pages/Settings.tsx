import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import pb from '@/lib/pocketbase';
import { toast } from 'sonner';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const handleDisconnectSpotify = async () => {
    try {
      // Get current user record to preserve existing services
      const userRecord = await pb.collection('users').getOne(user.id);
      const services = userRecord.connectedServices || [];

      // Find and update Spotify service
      const updatedServices = services.map((service) =>
        service.id === 'spotify' ? { ...service, connected: false } : service
      );

      // Update user record with modified services
      await pb.collection('users').update(user.id, {
        connectedServices: updatedServices,
      });

      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      toast.success('Disconnected from Spotify');
    } catch (error) {
      console.error('Failed to disconnect from Spotify:', error);
      toast.error('Failed to disconnect from Spotify');
    }
  };

  const handleDisconnectAppleMusic = async () => {
    try {
      // Get current user record to preserve existing services
      const userRecord = await pb.collection('users').getOne(user.id);
      const services = userRecord.connectedServices || [];

      // Find and update Apple Music service
      const updatedServices = services.map((service) =>
        service.id === 'apple-music'
          ? { ...service, connected: false }
          : service
      );

      // Update user record with modified services
      await pb.collection('users').update(user.id, {
        connectedServices: updatedServices,
      });

      localStorage.removeItem('apple_music_token');
      toast.success('Disconnected from Apple Music');
    } catch (error) {
      console.error('Failed to disconnect from Apple Music:', error);
      toast.error('Failed to disconnect from Apple Music');
    }
  };

  const handleDisconnectTidal = async () => {
    try {
      const userRecord = await pb.collection('users').getOne(user.id);
      const services = userRecord.connectedServices || [];

      const updatedServices = services.map((service) =>
        service.id === 'tidal' ? { ...service, connected: false } : service
      );

      await pb.collection('users').update(user.id, {
        connectedServices: updatedServices,
      });

      localStorage.removeItem('tidal_access_token');
      localStorage.removeItem('tidal_refresh_token');
      localStorage.removeItem('tidal_token_expires_at');
      toast.success('Disconnected from Tidal');
    } catch (error) {
      console.error('Failed to disconnect from Tidal:', error);
      toast.error('Failed to disconnect from Tidal');
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how Velvet Metal looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) =>
                  setTheme(checked ? 'dark' : 'light')
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>
              Manage your connected music streaming services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-medium">Spotify</h3>
                <p className="text-sm text-muted-foreground">
                  Disconnect your Spotify account
                </p>
              </div>
              <Button variant="destructive" onClick={handleDisconnectSpotify}>
                Disconnect
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-medium">Apple Music</h3>
                <p className="text-sm text-muted-foreground">
                  Disconnect your Apple Music account
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDisconnectAppleMusic}
              >
                Disconnect
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-medium">Tidal</h3>
                <p className="text-sm text-muted-foreground">
                  Disconnect your Tidal account
                </p>
              </div>
              <Button variant="destructive" onClick={handleDisconnectTidal}>
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
