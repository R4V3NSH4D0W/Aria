export interface Track {
  type?: "track";
  title: string;
  videoId: string;
  uploaderName: string;
  artistId?: string;
  duration: number; // in seconds
  thumbnail: string;
  isResolving?: boolean;
  addedAt?: number;
  localPath?: string;
  downloadedAt?: number;
  artists?: { name: string; id: string | null }[];
}

export interface ArtistItem {
  type: "artist";
  browseId: string;
  title: string;
  thumbnail: string;
  shufflePlaylistId?: string;
}

export interface ArtistDetails {
  browseId: string;
  name: string;
  thumbnail: string;
  description?: string;
  subscribers?: string;
  songs: Track[];
}

export interface FavoriteArtist {
  browseId: string;
  name: string;
  thumbnail: string;
  isPinned?: boolean;
}

export type SearchResultItem = Track | ArtistItem;

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface HomeSection {
  title: string;
  items: Track[];
}

// YouTube Music user playlist (fetched via auth cookie)
export interface YtPlaylist {
  id: string;      // browseId e.g. VLPLxxxxxxxx
  title: string;
  thumbnail: string;
  subtitle: string; // e.g. "12 songs"
}

export interface SavedRadio {
  id: string; // RDxxxxxxxx
  videoId: string; // Seed videoId
  title: string;
  thumbnail: string;
  thumbnails?: string[]; // First 4 track thumbnails for cover collage
  tracks?: Track[];      // Cached tracks for offline playback
  addedAt: number;
}
