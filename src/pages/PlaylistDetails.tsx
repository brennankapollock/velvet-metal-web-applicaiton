import { Button } from '@/components/ui/button';
import { getSpotifyPlaylistDetails } from '@/lib/api/spotify';
import { onTransferPlaylist } from '@/lib/api/transfer';
import { DetailedPlaylist } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Play, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { getServiceAuth } from '@/lib/services/streaming-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TransferPlaylistModal } from '@/components/TransferPlaylistModal';
import { useState } from 'react';

export default function PlaylistDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/login', { state: { from: `/playlist/${id}` } });
    }
  }, [user, id, navigate]);

  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery<DetailedPlaylist>({
    queryKey: ['playlistDetails', id, user?.id],
    queryFn: async () => {
      if (!id) {
        console.error('No playlist ID provided');
        throw new Error('No playlist ID provided');
      }
      if (!user) {
        console.error('No user found');
        throw new Error('No user found');
      }
      
      console.log('Getting Spotify auth for user:', user.id);
      const auth = await getServiceAuth(user.id, 'spotify');
      
      if (!auth) {
        console.error('Spotify not connected');
        throw new Error('Spotify not connected');
      }
      
      if (!auth.accessToken) {
        console.error('No access token found in auth');
        throw new Error('No access token found');
      }
      
      console.log('Fetching playlist details for:', id);
      return getSpotifyPlaylistDetails(id, auth.accessToken, user?.id);
    },
    enabled: !!id && !!user,
  });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const handleTransfer = () => {
    if (playlist) {
      setIsTransferModalOpen(true);
    }
  };

  if (error) {
    console.error('Error fetching playlist:', error);
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500">Error loading playlist</h2>
          <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !playlist) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check if tracks exist
  if (!playlist.tracks?.items) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500">No tracks found</h2>
          <p className="mt-2 text-muted-foreground">This playlist appears to be empty</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-none space-y-8 p-8">
        <Button
          variant="ghost"
          className="w-fit gap-2"
          onClick={() => navigate('/library')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>

        {/* Playlist Header */}
        <div className="flex items-start gap-8">
          {playlist.images?.[0]?.url && (
            <div className="relative aspect-square w-48 overflow-hidden rounded-lg">
              <img
                src={playlist.images[0].url}
                alt={playlist.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col justify-end space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium uppercase tracking-wider">
                  {playlist.service === 'spotify' ? 'Spotify' : playlist.service === 'apple-music' ? 'Apple Music' : playlist.service}
                </span>
                <span>•</span>
                <span>Playlist</span>
              </div>
              <h1 className="text-4xl font-bold mt-1">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-xl text-muted-foreground">{playlist.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {playlist.owner?.display_name && (
                <>
                  <span>By {playlist.owner.display_name}</span>
                  <span>•</span>
                </>
              )}
              <span>{playlist.tracks_count} songs</span>
            </div>
            <div className="flex items-center gap-3">
              <Button size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                Play
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTransfer();
                }}
              >
                <Plus className="h-5 w-5" />
                Transfer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
        <div className="space-y-4">
          <div className="sticky top-0 z-10 bg-background grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 px-4 py-2 text-sm text-muted-foreground">
            <span className="w-8">#</span>
            <span>Title</span>
            <span>Album</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            {playlist.tracks.items.map((item, index) => (
              <div
                key={item.track.id}
                className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 rounded-md px-4 py-2 hover:bg-accent cursor-pointer"
              >
                <span className="w-8 text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{item.track.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.track.artists.map(a => a.name).join(', ')}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {item.track.album?.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(item.track.duration_ms)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {playlist && (
        <TransferPlaylistModal
          open={isTransferModalOpen}
          onOpenChange={setIsTransferModalOpen}
          sourceService={playlist.service}
          playlist={playlist}
          userId={user!.id}
          onTransferComplete={() => {
            setIsTransferModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
