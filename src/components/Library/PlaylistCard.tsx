import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NormalizedPlaylist, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlaylistCardProps {
  playlist: NormalizedPlaylist;
  viewMode: ViewMode;
  onTransfer: (playlist: NormalizedPlaylist) => void;
  isSelectionMode?: boolean;
  onSelect?: (playlist: NormalizedPlaylist) => void;
}

export const PlaylistCard = ({
  playlist,
  viewMode,
  onTransfer,
  isSelectionMode,
  onSelect,
}: PlaylistCardProps) => {
  const navigate = useNavigate();

  if (!playlist) {
    return null;
  }

  const handleClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(playlist);
    } else {
      navigate(`/playlist/${playlist.playlist_id}`);
    }
  };

  // Get artwork URL safely with fallback
  const artworkUrl = playlist.artwork?.url || '';

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-none bg-transparent shadow-none transition-all hover:bg-accent",
        isSelectionMode && "cursor-pointer"
      )}
      role="button"
      tabIndex={0}
      aria-label={`Playlist: ${playlist.name}`}
      onClick={handleClick}
    >
      <div
        className={cn(
          'flex p-4',
          viewMode === 'grid'
            ? 'flex-col space-y-3'
            : 'flex-row items-center gap-4'
        )}
      >
        <div
          className={cn(
            'group/image relative overflow-hidden rounded-md',
            viewMode === 'grid' ? 'aspect-square w-full' : 'h-20 w-20'
          )}
        >
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.name}
              className="h-full w-full object-cover transition-all group-hover/image:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {!isSelectionMode && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add play functionality
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onTransfer(playlist);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{playlist.name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {playlist.tracks_count} tracks
            </p>
          </div>
          <div className="selection-target -mt-2" />
        </div>
      </div>
    </Card>
  );
};
