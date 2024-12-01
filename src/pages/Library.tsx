import { AlbumCard } from '@/components/AlbumCard';
import { LibrarySkeleton } from '@/components/LibrarySkeleton';
import { PlaylistCard } from '@/components/PlaylistCard';
import { TransferPlaylistModal } from '@/components/TransferPlaylistModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import VirtualizedGrid from '@/components/VirtualizedGrid';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import pb from '@/lib/pocketbase';
import { getStoredLibrary, syncLibrary } from '@/lib/services/librarySync';
import { NormalizedAlbum, Playlist, ServiceType, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Library as LibraryIcon,
  List,
  ListMusic,
  Loader2,
  Music,
  Music2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeService, setActiveService] = useState<ServiceType>('spotify');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  );
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<'albums' | 'playlists'>('albums');
  const queryClient = useQueryClient();

  const MemoizedAlbumCard = memo(AlbumCard);
  const MemoizedPlaylistCard = memo(PlaylistCard);

  // Get User Services
  const { data: userServices } = useQuery({
    queryKey: ['userServices', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const record = await pb.collection('users').getOne(user.id);
      return record.connectedServices || [];
    },
    enabled: !!user,
    suspense: true,
  });

  // Check if the user's service is connected
  const isServiceConnected = useMemo(() => {
    return userServices?.some(
      (service) => service.id === activeService && service.connected
    );
  }, [userServices, activeService]);

  // Get User's Library
  const { data, isLoading, isError } = useQuery({
    queryKey: ['storedLibrary', activeService],
    queryFn: async () => {
      try {
        const data = await getStoredLibrary(user!.id, activeService);
        return data;
      } catch (error) {
        if (error.status === 404) {
          return {
            albums: [],
            playlists: [],
            lastSynced: null,
          };
        }
        throw error;
      }
    },
    enabled: !!activeService && !!user && isServiceConnected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => {
      const processed = {
        albums: Array.isArray(data.albums)
          ? data.albums
          : data.albums?.items || data.albums?.data || [],
        playlists: Array.isArray(data.playlists)
          ? data.playlists
          : data.playlists?.items || data.playlists?.data || [],
        lastSynced: data.lastSynced,
      };
      return processed;
    },
  });

  const albums: NormalizedAlbum[] = data?.albums || [];
  const playlists: Playlist[] = data?.playlists || [];

  const sortFunction = useCallback(
    (a: NormalizedAlbum, b: NormalizedAlbum, key: string, order: string) => {
      let aValue = '';
      let bValue = '';

      if (key === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (key === 'artist') {
        aValue = a.artistName.toLowerCase();
        bValue = b.artistName.toLowerCase();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    },
    []
  );

  const filteredAlbums = useMemo(() => {
    let result = debouncedSearchQuery
      ? albums.filter(
          (album: NormalizedAlbum) =>
            album.name
              .toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase()) ||
            album.artistName
              .toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase())
        )
      : albums;

    if (sortBy) {
      const [key, order] = sortBy.split('-');
      result = [...result].sort((a, b) => sortFunction(a, b, key, order));
    }

    return result;
  }, [albums, debouncedSearchQuery, sortBy, sortFunction]);

  const filteredPlaylists = useMemo(() => {
    let result = playlists;
    if (debouncedSearchQuery) {
      result = result.filter((playlist: Playlist) =>
        (playlist.name || playlist.attributes?.name || '')
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase())
      );
    }

    if (sortBy) {
      const [key, order] = sortBy.split('-');
      result = [...result].sort((a: Playlist, b: Playlist) => {
        const aValue = (a.name || a.attributes?.name || '').toLowerCase();
        const bValue = (b.name || b.attributes?.name || '').toLowerCase();
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [playlists, debouncedSearchQuery, sortBy]);

  const handleTransfer = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsTransferModalOpen(true);
  }, []);

  const handleManualRefresh = async () => {
    try {
      const accessToken = localStorage.getItem(
        activeService === 'spotify'
          ? 'spotify_access_token'
          : 'apple_music_token'
      );
      const refreshToken = localStorage.getItem('spotify_refresh_token');

      if (!isServiceConnected) {
        toast.error(
          `Please connect your ${
            activeService === 'spotify' ? 'Spotify' : 'Apple Music'
          } account first`
        );
        navigate('/');
        return;
      }

      if (activeService === 'spotify' && (!accessToken || !refreshToken)) {
        toast.error('Please reconnect your Spotify account');
        navigate('/');
        return;
      }

      if (activeService === 'apple-music' && !accessToken) {
        toast.error('Please reconnect your Apple Music account');
        navigate('/');
        return;
      }

      await syncLibrary(user!.id, activeService);
      queryClient.invalidateQueries(['storedLibrary', activeService]);
      toast.success('Library refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh library:', error);
      if (error instanceof Error && error.message.includes('token')) {
        toast.error(
          `Please reconnect your ${
            activeService === 'spotify' ? 'Spotify' : 'Apple Music'
          } account`
        );
        navigate('/');
      } else {
        toast.error('Failed to refresh library. Please try again.');
      }
    }
  };

  if (!isServiceConnected) {
    return <LibrarySkeleton />;
  }

  return (
    <>
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Library</h2>
            <p className="text-muted-foreground">
              Your music collection from{' '}
              {activeService === 'spotify' ? 'Spotify' : 'Apple Music'}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleManualRefresh}
                  className="h-8 w-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Library</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* CONTROL SECTION */}
          <div className="flex flex-col mb-8 space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:gap-4">
              <TabsList className="w-full md:w-[400px] grid grid-cols-2">
                <TabsTrigger value="albums" className="flex items-center gap-2">
                  <LibraryIcon className="h-4 w-4" />
                  Albums
                </TabsTrigger>
                <TabsTrigger
                  value="playlists"
                  className="flex items-center gap-2"
                >
                  <ListMusic className="h-4 w-4" />
                  Playlists
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                <Button
                  variant={activeService === 'spotify' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveService('spotify')}
                  className="flex-1 md:flex-initial items-center gap-2"
                >
                  <Music className="h-4 w-4" />
                  <span className="hidden sm:inline">Spotify</span>
                </Button>
                <Button
                  variant={
                    activeService === 'apple-music' ? 'secondary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => setActiveService('apple-music')}
                  className="flex-1 md:flex-initial items-center gap-2"
                >
                  <Music2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Apple Music</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:gap-3">
              <div className="relative flex-1 md:w-[280px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 md:w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="artist-asc">Artist (A-Z)</SelectItem>
                    <SelectItem value="artist-desc">Artist (Z-A)</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8"
                    aria-label="Grid View"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8"
                    aria-label="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ALBUMS TAB */}
          <TabsContent value="albums" className="space-y-6">
            {isLoading ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="flex justify-center">
                <p className="text-destructive">Failed to load albums</p>
              </div>
            ) : albums.length === 0 ? (
              <div className="flex justify-center">
                <p>No albums available.</p>
              </div>
            ) : (
              <VirtualizedGrid
                items={filteredAlbums}
                viewMode={viewMode}
                ItemComponent={MemoizedAlbumCard}
              />
            )}
          </TabsContent>

          {/* PLAYLISTS TAB */}
          <TabsContent value="playlists" className="space-y-6">
            {isLoading ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="flex justify-center">
                <p className="text-destructive">Failed to load playlists</p>
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex justify-center">
                <p>No playlists available.</p>
              </div>
            ) : (
              <div
                className={cn(
                  'grid gap-6',
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    : 'grid-cols-1'
                )}
              >
                {filteredPlaylists.map((playlist: Playlist) => (
                  <MemoizedPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    viewMode={viewMode}
                    onTransfer={handleTransfer}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedPlaylist && (
        <TransferPlaylistModal
          open={isTransferModalOpen}
          onOpenChange={setIsTransferModalOpen}
          sourceService={activeService}
          playlist={selectedPlaylist}
          onTransferComplete={() => {
            setSelectedPlaylist(null);
            toast.success('Playlist transferred successfully!');
          }}
        />
      )}
    </>
  );
}
