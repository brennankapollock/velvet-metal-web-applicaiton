// import { Button } from '@/components/ui/button';
// import { Slider } from '@/components/ui/slider';
// import { usePlayer } from '@/contexts/player-context';
// import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
// import { useState } from 'react';

// export function Player() {
//   const {
//     currentTrack,
//     currentAlbum,
//     isPlaying,
//     play,
//     pause,
//     resume,
//     next,
//     previous,
//   } = usePlayer();
//   const [volume, setVolume] = useState(100);

//   if (!currentTrack || !currentAlbum) return null;

//   return (
//     <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
//       <div className="mx-auto grid max-w-7xl grid-cols-3">
//         {/* Track Info - Left */}
//         <div className="flex w-[300px] items-center gap-4">
//           <img
//             src={currentAlbum.artwork.url}
//             alt={currentAlbum.name}
//             className="h-12 w-12 rounded-md"
//           />
//           <div className="min-w-0">
//             <h4 className="truncate text-sm font-medium">
//               {currentTrack.name}
//             </h4>
//             <p className="truncate text-xs text-muted-foreground">
//               {currentTrack.artistName}
//             </p>
//           </div>
//         </div>

//         {/* Playback Controls - Center */}
//         <div className="flex items-center justify-center">
//           <div className="flex items-center gap-4">
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={previous}
//               className="h-8 w-8"
//             >
//               <SkipBack className="h-4 w-4" />
//             </Button>
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={isPlaying ? pause : resume}
//               className="h-8 w-8"
//             >
//               {isPlaying ? (
//                 <Pause className="h-4 w-4" />
//               ) : (
//                 <Play className="h-4 w-4" />
//               )}
//             </Button>
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={next}
//               className="h-8 w-8"
//             >
//               <SkipForward className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>

//         {/* Volume Control - Right */}
//         <div className="flex items-center justify-end">
//           <div className="flex w-[200px] items-center gap-2">
//             <Volume2 className="h-4 w-4" />
//             <Slider
//               value={[volume]}
//               max={100}
//               step={1}
//               onValueChange={(value) => setVolume(value[0])}
//               className="w-[120px]"
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
