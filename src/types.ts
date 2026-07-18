export interface Track {
  type?: "track";
  title: string;
  videoId: string;
  uploaderName: string;
  duration: number; // in seconds
  thumbnail: string;
  isResolving?: boolean;
  addedAt?: number;
  localPath?: string;
  downloadedAt?: number;
}

export interface ArtistItem {
  type: "artist";
  browseId: string;
  title: string;
  thumbnail: string;
  shufflePlaylistId?: string;
}

export interface ArtistDetails {
  name: string;
  thumbnail: string;
  description?: string;
  subscribers?: string;
  songs: Track[];
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
