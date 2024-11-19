// import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
// import { AlbumTrack, NormalizedAlbum } from '@/lib/types';
// import { createContext, useContext, useState } from 'react';

// interface PlayerContextType {
//   currentTrack: AlbumTrack | null;
//   currentAlbum: NormalizedAlbum | null;
//   isPlaying: boolean;
//   play: (track: AlbumTrack, album: NormalizedAlbum) => Promise<void>;
//   pause: () => Promise<void>;
//   resume: () => Promise<void>;
//   next: () => Promise<void>;
//   previous: () => Promise<void>;
// }

// export const PlayerContext = createContext<PlayerContextType | undefined>(
//   undefined
// );

// export function PlayerProvider({ children }: { children: React.ReactNode }) {
//   const [currentTrack, setCurrentTrack] = useState<AlbumTrack | null>(null);
//   const [currentAlbum, setCurrentAlbum] = useState<NormalizedAlbum | null>(
//     null
//   );
//   const [isPlaying, setIsPlaying] = useState(false);
//   const { player, deviceId, isReady } = useSpotifyPlayback();

//   const play = async (track: AlbumTrack, album: NormalizedAlbum) => {
//     if (!deviceId || !isReady) return;

//     const accessToken = localStorage.getItem('spotify_access_token');
//     if (!accessToken) return;

//     try {
//       await fetch(
//         `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
//         {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${accessToken}`,
//           },
//           body: JSON.stringify({
//             uris: [`spotify:track:${track.id}`],
//             position_ms: 0,
//           }),
//         }
//       );

//       setCurrentTrack(track);
//       setCurrentAlbum(album);
//       setIsPlaying(true);
//     } catch (error) {
//       console.error('Failed to play track:', error);
//     }
//   };

//   const pause = async () => {
//     await player?.pause();
//     setIsPlaying(false);
//   };

//   const resume = async () => {
//     await player?.resume();
//     setIsPlaying(true);
//   };

//   const next = async () => {
//     await player?.nextTrack();
//   };

//   const previous = async () => {
//     await player?.previousTrack();
//   };

//   return (
//     <PlayerContext.Provider
//       value={{
//         currentTrack,
//         currentAlbum,
//         isPlaying,
//         play,
//         pause,
//         resume,
//         next,
//         previous,
//       }}
//     >
//       {children}
//     </PlayerContext.Provider>
//   );
// }

// export const usePlayer = () => {
//   const context = useContext(PlayerContext);
//   if (context === undefined) {
//     throw new Error('usePlayer must be used within a PlayerProvider');
//   }
//   return context;
// };
