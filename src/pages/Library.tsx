import { ExportLibraryDialog } from '@/components/ExportLibraryDialog';
import { AlbumCard } from '@/components/Library/AlbumCard';
import { PlaylistCard } from '@/components/Library/PlaylistCard';
import VirtualizedAlbumGrid from '@/components/Library/VirtualizedAlbumGrid';
import VirtualizedPlaylistGrid from '@/components/Library/VirtualizedPlaylistGrid';
import { LibrarySkeleton } from '@/components/LibrarySkeleton';
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
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import pb from '@/lib/pocketbase';
import {
  getStoredLibrary,
  normalizePlaylistData,
  syncLibrary,
} from '@/lib/services/librarySync';
import { NormalizedAlbum, Playlist, ServiceType, ViewMode } from '@/lib/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Grid,
  Library as LibraryIcon,
  List,
  ListMusic,
  Loader2,
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
  const [isExportOpen, setIsExportOpen] = useState(false);

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
      (service: any) => service.id === activeService && service.connected
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

  const normalizedPlaylists = useMemo(() => {
    return playlists.map((playlist) =>
      normalizePlaylistData(playlist, activeService)
    );
  }, [playlists, activeService]);

  const filteredPlaylists = useMemo(() => {
    let result = normalizedPlaylists;
    if (debouncedSearchQuery) {
      result = result.filter((playlist) =>
        playlist.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    if (sortBy) {
      const [key, order] = sortBy.split('-');
      result = [...result].sort((a, b) => {
        const aValue = a.name.toLowerCase();
        const bValue = b.name.toLowerCase();
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [normalizedPlaylists, debouncedSearchQuery, sortBy]);

  const handleTransfer = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsTransferModalOpen(true);
  }, []);

  const handleManualRefresh = async () => {
    try {
      const accessToken = localStorage.getItem(
        activeService === 'spotify'
          ? 'spotify_access_token'
          : activeService === 'apple-music'
          ? 'apple_music_token'
          : 'tidal_access_token'
      );
      const refreshToken = localStorage.getItem(
        activeService === 'spotify'
          ? 'spotify_refresh_token'
          : activeService === 'tidal'
          ? 'tidal_refresh_token'
          : ''
      );

      if (!isServiceConnected) {
        toast.error(
          `Please connect your ${
            activeService === 'spotify'
              ? 'Spotify'
              : activeService === 'apple-music'
              ? 'Apple Music'
              : 'Tidal'
          } account first`
        );
        navigate('/');
        return;
      }

      if (
        (activeService === 'spotify' || activeService === 'tidal') &&
        (!accessToken || !refreshToken)
      ) {
        toast.error(`Please reconnect your ${activeService} account`);
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
            activeService === 'spotify'
              ? 'Spotify'
              : activeService === 'apple-music'
              ? 'Apple Music'
              : 'Tidal'
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
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Library</h2>
            <p className="text-muted-foreground">
              Your Music Collection From{' '}
              {activeService === 'spotify' ? 'Spotify' : 'Apple Music'}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* CONTROL SECTION */}
          <div className="flex flex-col space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
              {/* Left Section: Tabs and Service Selection */}
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                <TabsList className="inline-flex h-9 items-center justify-center rounded-lg  p-1 text-muted-foreground">
                  <TabsTrigger
                    value="albums"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <LibraryIcon className="mr-2 h-4 w-4" />
                    Albums
                  </TabsTrigger>
                  <TabsTrigger
                    value="playlists"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <ListMusic className="mr-2 h-4 w-4" />
                    Playlists
                  </TabsTrigger>
                </TabsList>

                <Select
                  value={activeService}
                  onValueChange={(value: ServiceType) =>
                    setActiveService(value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spotify">Spotify</SelectItem>
                    <SelectItem value="apple-music">Apple Music</SelectItem>
                    <SelectItem value="tidal">Tidal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Middle Section: Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="h-9 pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Right Section: Sort and View Controls */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-[130px]">
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

                <div className="flex h-9 items-center gap-0.5 rounded-md border p-0.5">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className="h-7 w-7"
                    aria-label="Grid View"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className="h-7 w-7"
                    aria-label="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsExportOpen(true)}
                    className="h-7 w-7"
                    aria-label="Export Library"
                  >
                    <Download className="h-4 w-4" />
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
              <VirtualizedAlbumGrid
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
              // <div
              //   className={cn(
              //     'grid gap-6',
              //     viewMode === 'grid'
              //       ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              //       : 'grid-cols-1'
              //   )}
              // >
              //   {filteredPlaylists.map((playlist: Playlist) => (
              //     <MemoizedPlaylistCard
              //       key={playlist.id}
              //       playlist={playlist}
              //       viewMode={viewMode}
              //       onTransfer={handleTransfer}
              //     />
              //   ))}
              // </div>
              <VirtualizedPlaylistGrid
                items={filteredPlaylists}
                viewMode={viewMode}
                ItemComponent={MemoizedPlaylistCard}
                onTransfer={handleTransfer}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ExportLibraryDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        albums={albums}
        playlists={playlists}
        service={activeService}
      />

      {selectedPlaylist && (
        <TransferPlaylistModal
          open={isTransferModalOpen}
          onOpenChange={setIsTransferModalOpen}
          sourceService={activeService}
          playlist={selectedPlaylist}
          onTransferComplete={() => {
            setSelectedPlaylist(null);
            queryClient.invalidateQueries(['storedLibrary']);
          }}
        />
      )}
    </>
  );
}
