export interface Track {
  title: string;
  videoId: string;
  uploaderName: string;
  duration: number; // in seconds
  thumbnail: string;
  browseId?: string;
  browseParams?: string;
  isResolving?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface HomeSection {
  title: string;
  items: Track[];
}
