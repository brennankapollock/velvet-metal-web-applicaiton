import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceType, ViewMode } from '@/lib/types';
import {
  Download,
  Grid,
  Library as LibraryIcon,
  List,
  ListMusic,
  Search,
} from 'lucide-react';

interface ControlsProps {
  activeService: ServiceType;
  setActiveService: (service: ServiceType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onExport: () => void;
  activeTab: string;
  albumTypeFilter: 'all' | 'album' | 'single' | 'ep';
  onAlbumTypeChange: (type: 'all' | 'album' | 'single' | 'ep') => void;
  isSelectionMode?: boolean;
  onToggleSelection?: () => void;
}

export const Controls = ({
  activeService,
  setActiveService,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onExport,
  activeTab,
  albumTypeFilter,
  onAlbumTypeChange,
  isSelectionMode,
  onToggleSelection,
}: ControlsProps) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        {/* Left Section: Tabs and Service Selection */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <TabsList className="inline-flex h-9 items-center justify-center rounded-lg p-1 text-muted-foreground">
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
            onValueChange={(value: ServiceType) => setActiveService(value)}
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

          {activeTab === 'albums' ? (
            <Select value={albumTypeFilter} onValueChange={onAlbumTypeChange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Album Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="ep">EP</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isSelectionMode && onToggleSelection) {
                  // Clear selection state
                  onToggleSelection();
                } else if (onToggleSelection) {
                  onToggleSelection();
                }
              }}
            >
              {isSelectionMode ? 'Cancel Selection' : 'Select Playlists'}
            </Button>
          )}
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
              onClick={onExport}
              className="h-7 w-7"
              aria-label="Export Library"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
