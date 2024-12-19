import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { transferPlaylist } from '@/lib/services/transfer';
import { getServiceAuth } from '@/lib/services/streaming-auth';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, Music, Music2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TransferProgress {
  playlistId: string;
  stage: 'fetching' | 'creating' | 'searching' | 'adding' | 'complete' | 'error';
  progress: number;
  message: string;
  destinationPlaylistName?: string;
  error?: string;
}

interface BulkTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceService: 'spotify' | 'apple-music';
  playlists: any[];
  userId: string;
  onTransferComplete?: () => void;
}

export function BulkTransferModal({
  open,
  onOpenChange,
  sourceService,
  playlists,
  userId,
  onTransferComplete,
}: BulkTransferModalProps) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [progress, setProgress] = useState<Record<string, TransferProgress>>({});
  const [targetService, setTargetService] = useState<'spotify' | 'apple-music'>(
    sourceService === 'spotify' ? 'apple-music' : 'spotify'
  );

  const handleTransfer = async () => {
    setIsTransferring(true);
    
    try {
      const sourceTokenData = await getServiceAuth(userId, sourceService);
      const targetTokenData = await getServiceAuth(userId, targetService);

      if (!sourceTokenData?.accessToken || !targetTokenData?.accessToken) {
        toast.error('Authentication failed. Please reconnect your services.');
        return;
      }

      // Store tokens in localStorage for the transfer process
      if (sourceService === 'spotify') {
        localStorage.setItem('spotify_access_token', sourceTokenData.accessToken);
        localStorage.setItem('apple_music_token', targetTokenData.accessToken);
      } else {
        localStorage.setItem('apple_music_token', sourceTokenData.accessToken);
        localStorage.setItem('spotify_access_token', targetTokenData.accessToken);
      }

      // Transfer playlists in parallel with a limit
      const batchSize = 3; // Process 3 playlists at a time
      for (let i = 0; i < playlists.length; i += batchSize) {
        const batch = playlists.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (playlist) => {
            try {
              setProgress((prev) => ({
                ...prev,
                [playlist.id]: {
                  playlistId: playlist.id,
                  stage: 'fetching',
                  progress: 0,
                  message: `Starting transfer of "${playlist.name}"...`,
                },
              }));

              await transferPlaylist({
                sourceService,
                targetService,
                playlist,
                sourceToken: sourceTokenData.accessToken,
                targetToken: targetTokenData.accessToken,
                userId,
                onProgress: (currentProgress) => {
                  setProgress((prev) => ({
                    ...prev,
                    [playlist.id]: {
                      ...currentProgress,
                      playlistId: playlist.id,
                    },
                  }));
                },
              });
            } catch (error) {
              setProgress((prev) => ({
                ...prev,
                [playlist.id]: {
                  playlistId: playlist.id,
                  stage: 'error',
                  progress: 0,
                  message: 'Transfer failed',
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              }));
            }
          })
        );
      }

      toast.success('All playlists transferred successfully!');
      onTransferComplete?.();
    } catch (error) {
      toast.error('Failed to transfer playlists');
    } finally {
      setIsTransferring(false);
    }
  };

  const allComplete = Object.keys(progress).length > 0 && Object.values(progress).every(
    (p) => p.stage === 'complete' || p.stage === 'error'
  );

  const totalProgress =
    Object.values(progress).reduce((sum, p) => sum + p.progress, 0) / playlists.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer {playlists.length} Playlists</DialogTitle>
          <DialogDescription>
            Choose where you want to transfer your playlists
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Destination Service</Label>
            <RadioGroup
              defaultValue={targetService}
              onValueChange={(value: 'spotify' | 'apple-music') =>
                setTargetService(value)
              }
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="spotify"
                  id="spotify"
                  className="peer sr-only"
                  disabled={sourceService === 'spotify' || isTransferring}
                />
                <Label
                  htmlFor="spotify"
                  className={cn(
                    'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                    (sourceService === 'spotify' || isTransferring) &&
                      'cursor-not-allowed opacity-50'
                  )}
                >
                  <Music2 className="mb-3 h-6 w-6" />
                  Spotify
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="apple-music"
                  id="apple-music"
                  className="peer sr-only"
                  disabled={sourceService === 'apple-music' || isTransferring}
                />
                <Label
                  htmlFor="apple-music"
                  className={cn(
                    'flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                    (sourceService === 'apple-music' || isTransferring) &&
                      'cursor-not-allowed opacity-50'
                  )}
                >
                  <Music className="mb-3 h-6 w-6" />
                  Apple Music
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Selected Playlists</Label>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex items-center justify-between p-2 rounded-md bg-accent/50"
                >
                  <div className="flex items-center space-x-2">
                    <Music2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{playlist.name}</span>
                  </div>
                  {progress[playlist.id] && (
                    <div className="flex items-center space-x-2">
                      {progress[playlist.id].stage === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : progress[playlist.id].stage === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {progress[playlist.id].stage === 'complete'
                          ? 'Complete'
                          : progress[playlist.id].stage === 'error'
                          ? 'Failed'
                          : `${Math.round(progress[playlist.id].progress)}%`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isTransferring && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isTransferring}
            >
              {allComplete ? 'Close' : 'Cancel'}
            </Button>
            {(!allComplete || Object.keys(progress).length === 0) && !isTransferring && (
              <Button
                onClick={handleTransfer}
                disabled={isTransferring}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Start Transfer'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
