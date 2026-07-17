export interface Track {
  type?: "track";
  title: string;
  videoId: string;
  uploaderName: string;
  duration: number; // in seconds
  thumbnail: string;
  isResolving?: boolean;
  addedAt?: number;
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

