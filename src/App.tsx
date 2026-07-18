import { AlertCircle, WifiOff } from "lucide-react";
import { Track } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ArtistDetailsView } from "./components/ArtistDetailsView";
import { Player } from "./components/Player";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";
import { QueuePanel } from "./components/QueuePanel.tsx";
import { LyricsOverlay } from "./components/LyricsOverlay";
import { Home } from "./components/Home";
import { Settings } from "./components/Settings";
import { SearchView } from "./components/SearchView";
import { LibraryView } from "./components/LibraryView";
import { usePlayback } from "./hooks/usePlayback";
import { useLibrary } from "./hooks/useLibrary";
import { useSearch } from "./hooks/useSearch";
import { useArtist } from "./hooks/useArtist";
import { useHome } from "./hooks/useHome";
import { useExplore } from "./hooks/useExplore";
import { useYtPlaylist } from "./hooks/useYtPlaylist";
import { useEffect, useState } from "react";
import { YtPlaylistsView } from "./components/YtPlaylistsView";

export default function App() {
  const [wallpaperUrl, setWallpaperUrl] = useState(() => localStorage.getItem("aria_wallpaper_url") || "https://w.wallhaven.cc/full/gw/wallhaven-gwmj9l.png");
  const [wallpaperOpacity, setWallpaperOpacity] = useState(() => {
    const saved = localStorage.getItem("aria_wallpaper_opacity");
    return saved ? parseFloat(saved) : 0.3;
  });

  const {
    playlists,
    ytPlaylists,
    favorites,
    favoriteSort,
    recentlyPlayed,
    activeTab,
    isSidebarOpen,
    isOnline,
    showCreatePlaylistModal,
    newPlaylistName,
    activeDropdownTrackId,
    downloads,
    downloadingTrackIds,
    setYtPlaylists,
    setFavoriteSort,
    setActiveTab,
    setIsSidebarOpen,
    setShowCreatePlaylistModal,
    setNewPlaylistName,
    setActiveDropdownTrackId,
    isFavorite,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    handleTabChange: baseHandleTabChange,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    addToRecentlyPlayed,
    downloadTrack,
    deleteDownload,
  } = useLibrary();

  const [showLyricsMode, setShowLyricsMode] = useState(false);

  // Automatically minimize sidebar on small viewports, maximize on desktops
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const listener = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsSidebarOpen(!e.matches);
    };
    // Set initial state
    setIsSidebarOpen(!media.matches);
    
    if (media.addEventListener) {
      media.addEventListener("change", listener as EventListener);
    } else {
      (media as any).addListener(listener);
    }
    
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener as EventListener);
      } else {
        (media as any).removeListener(listener);
      }
    };
  }, [setIsSidebarOpen]);

  const {
    searchQuery,
    loading,
    searchResults,
    searchError,
    hasSearched,
    setSearchQuery,
    setSearchResults,
    resolveTrackDuration,
    handleSearch,
    handleExploreGenre,
  } = useSearch({
    setActiveTab,
  });

  const {
    selectedArtist,
    artistLoading,
    artistError,
    setSelectedArtist,
    loadArtist,
  } = useArtist({
    resolveTrackDuration,
  });

  const {
    sections: homeSections,
    loading: homeLoading,
    error: homeError,
    fetchHome,
  } = useHome();

  const {
    playlists: communityPlaylists,
    loading: communityLoading,
    fetchExplore,
  } = useExplore();

  const {
    tracks: ytPlaylistTracks,
    loading: ytPlaylistLoading,
    loadPlaylist,
  } = useYtPlaylist();

  // Load YT playlist tracks whenever a yt: tab is activated
  useEffect(() => {
    if (activeTab.startsWith("yt:")) {
      const browseId = activeTab.slice(3); // strip "yt:"
      loadPlaylist(browseId);
    }
  }, [activeTab, loadPlaylist]);

  const handleTabChange = (tab: string) => {
    baseHandleTabChange(tab);
    setSelectedArtist(null);
  };

  const getActiveTracks = (): Track[] => {
    if (selectedArtist) {
      return selectedArtist.songs;
    }
    if (activeTab === "recently-played") {
      return recentlyPlayed;
    }
    if (activeTab === "search") {
      return searchResults.filter((item): item is Track => !("type" in item && item.type === "artist"));
    }
    if (activeTab === "favorites") {
      const sortedFavorites = [...favorites].sort((a, b) => {
        if (favoriteSort === "title") {
          return a.title.localeCompare(b.title);
        }

        const left = a.addedAt ?? 0;
        const right = b.addedAt ?? 0;
        return favoriteSort === "recent" ? right - left : left - right;
      });
      return sortedFavorites;
    }
    if (activeTab.startsWith("yt:")) {
      return ytPlaylistTracks;
    }
    const pl = playlists.find((p) => p.id === activeTab);
    return pl ? pl.tracks : [];
  };

  const {
    currentTrack,
    queue,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    isLooping,
    isShuffled,
    playbackError,
    resolvedAudioUrl,
    lyrics,
    lyricsLoading,
    audioRef,
    setIsShuffled,
    setIsLooping,
    playTrack,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    handleNext,
    handlePrev,
    addTrackToQueue,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    playSongs,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleAudioEnded,
  } = usePlayback({
    getActiveTracks,
    onTrackPlayed: addToRecentlyPlayed,
    onResolveStateChange: (videoId, isResolving) => {
      setSearchResults((prev) =>
        prev.map((t) =>
          t.type !== "artist" && t.videoId === videoId ? { ...t, isResolving } : t
        )
      );
    },
  });

  const hasQueue = queue.length > 0;

  return (
    <main className={`h-screen w-screen text-slate-100 flex flex-col font-sans relative overflow-hidden select-none transition-colors duration-500 ${wallpaperUrl ? "bg-[#040506]" : "bg-[#08090a]"}`}>
      {/* Background Wallpaper Layer */}
      {wallpaperUrl && (
        <img
          src={wallpaperUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none z-0 transition-opacity duration-500"
          style={{ opacity: wallpaperOpacity }}
        />
      )}

      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={resolvedAudioUrl || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        loop={isLooping}
      />

      <div data-tauri-drag-region className="h-8 shrink-0 z-20" />

      {!isOnline && (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-inner z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You are offline. Reconnect to search and stream tracks.</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-all cursor-pointer border border-amber-500/30"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden z-10">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          playlists={playlists}
          deletePlaylist={(id, e) => {
            deletePlaylist(id, e);
            setSelectedArtist(null);
          }}
          setShowCreatePlaylistModal={setShowCreatePlaylistModal}
          hasPlayer={!!currentTrack}
          isOpen={isSidebarOpen}
        />

        {/* Main Content Area */}
        <section
          className={`flex-1 flex flex-col overflow-y-auto transition-[padding] duration-500 ease-out ${currentTrack ? "pb-36" : ""}`}
        >
          <Header
            activeTab={activeTab}
            playlists={playlists}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            favoriteSort={favoriteSort}
            setFavoriteSort={setFavoriteSort}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((open) => !open)}
            onOpenSettings={() => setActiveTab("settings")}
            ytPlaylists={ytPlaylists}
          />

          <div
            className={`p-6 flex-1 grid grid-cols-1 gap-6 items-stretch ${
              hasQueue ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-1"
            }`}
          >
            {/* Connection mode / alert toast */}
            <div className="lg:col-span-1 min-w-0 flex flex-col gap-6 h-full">
              {artistLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                  <div className="relative w-14 h-14 -translate-y-5">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin shimmer-reverse" />
                  </div>
                  <p className="text-slate-400 text-sm animate-pulse font-medium -translate-y-5">
                    Loading Artist Profile...
                  </p>
                </div>
              ) : selectedArtist ? (
                <ArtistDetailsView
                  artist={selectedArtist}
                  onBack={() => setSelectedArtist(null)}
                  playSongs={playSongs}
                  playTrack={playTrack}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  activeDropdownTrackId={activeDropdownTrackId}
                  setActiveDropdownTrackId={setActiveDropdownTrackId}
                  playlists={playlists}
                  addTrackToPlaylist={addTrackToPlaylist}
                  addTrackToQueue={addTrackToQueue}
                  toggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                  setShowCreatePlaylistModal={setShowCreatePlaylistModal}
                />
              ) : activeTab === "home" ? (
                <Home
                  playSongs={playSongs}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  favorites={favorites}
                  playlists={playlists}
                  ytPlaylists={ytPlaylists}
                  recentlyPlayed={recentlyPlayed}
                  onOpenTab={setActiveTab}
                  onExploreGenre={handleExploreGenre}
                  sections={homeSections}
                  loading={homeLoading}
                  error={homeError}
                  fetchHome={fetchHome}
                  communityPlaylists={communityPlaylists}
                  communityLoading={communityLoading}
                  fetchExplore={fetchExplore}
                />
              ) : activeTab === "settings" ? (
                <Settings
                  onPlaylistsSync={setYtPlaylists}
                  wallpaperUrl={wallpaperUrl}
                  setWallpaperUrl={setWallpaperUrl}
                  wallpaperOpacity={wallpaperOpacity}
                  setWallpaperOpacity={setWallpaperOpacity}
                />
              ) : (
                <>
                  {artistError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 shadow-inner">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                      <span>{artistError}</span>
                    </div>
                  )}

                  {activeTab === "search" ? (
                    <SearchView
                      loading={loading}
                      searchError={searchError}
                      hasSearched={hasSearched}
                      searchResults={searchResults}
                      loadArtist={loadArtist}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playTrack={playTrack}
                      activeDropdownTrackId={activeDropdownTrackId}
                      setActiveDropdownTrackId={setActiveDropdownTrackId}
                      playlists={playlists}
                      addTrackToPlaylist={addTrackToPlaylist}
                      addTrackToQueue={addTrackToQueue}
                      toggleFavorite={toggleFavorite}
                      isFavorite={isFavorite}
                      removeTrackFromPlaylist={removeTrackFromPlaylist}
                      setShowCreatePlaylistModal={setShowCreatePlaylistModal}
                      downloads={downloads}
                      downloadingTrackIds={downloadingTrackIds}
                      downloadTrack={downloadTrack}
                      deleteDownload={deleteDownload}
                    />
                  ) : activeTab === "yt-playlists" ? (
                    <YtPlaylistsView
                      ytPlaylists={ytPlaylists}
                      onSelectPlaylist={(id) => setActiveTab(`yt:${id}`)}
                    />
                  ) : ytPlaylistLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                      <div className="relative w-14 h-14 -translate-y-5">
                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin shimmer-reverse" />
                      </div>
                      <p className="text-slate-400 text-sm animate-pulse font-medium -translate-y-5">
                        Loading Playlist...
                      </p>
                    </div>
                  ) : (
                    <LibraryView
                      activeTab={activeTab}
                      tracks={getActiveTracks()}
                      playSongs={playSongs}
                      playTrack={playTrack}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      activeDropdownTrackId={activeDropdownTrackId}
                      setActiveDropdownTrackId={setActiveDropdownTrackId}
                      playlists={playlists}
                      addTrackToPlaylist={addTrackToPlaylist}
                      addTrackToQueue={addTrackToQueue}
                      toggleFavorite={toggleFavorite}
                      isFavorite={isFavorite}
                      removeTrackFromPlaylist={removeTrackFromPlaylist}
                      setShowCreatePlaylistModal={setShowCreatePlaylistModal}
                      downloads={downloads}
                      downloadingTrackIds={downloadingTrackIds}
                      downloadTrack={downloadTrack}
                      deleteDownload={deleteDownload}
                      onBack={activeTab.startsWith("yt:") ? () => setActiveTab("yt-playlists") : undefined}
                    />
                  )}
                </>
              )}
            </div>

            {(hasQueue) && (
              <QueuePanel
                queue={queue}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={(track: Track) => playTrack(track)}
                onMoveTrack={reorderQueue}
                onRemoveTrack={removeFromQueue}
                onClearQueue={clearQueue}
              />
            )}
          </div>
        </section>
      </div>

      {/* Footer Player Card */}
      {currentTrack && (
        <div className="relative z-50">
          <Player
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isShuffled={isShuffled}
            isLooping={isLooping}
            isMuted={isMuted}
            progress={progress}
            duration={duration}
            volume={volume}
            playbackError={playbackError}
            togglePlay={togglePlay}
            toggleMute={toggleMute}
            toggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
            setIsShuffled={setIsShuffled}
            setIsLooping={setIsLooping}
            handleSeek={handleSeek}
            handleVolumeChange={handleVolumeChange}
            handleNext={handleNext}
            handlePrev={handlePrev}
            playlists={playlists}
            addTrackToPlaylist={addTrackToPlaylist}
            setShowCreatePlaylistModal={setShowCreatePlaylistModal}
            showLyricsMode={showLyricsMode}
            setShowLyricsMode={setShowLyricsMode}
          />
        </div>
      )}

      {/* Full-screen Immersive Lyrics Mode Overlay */}
      {currentTrack && (
        <LyricsOverlay
          show={showLyricsMode}
          onClose={() => setShowLyricsMode(false)}
          currentTrack={currentTrack}
          lyrics={lyrics}
          lyricsLoading={lyricsLoading}
          audioRef={audioRef}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <CreatePlaylistModal
          newPlaylistName={newPlaylistName}
          setNewPlaylistName={setNewPlaylistName}
          createPlaylist={createPlaylist}
          setShowCreatePlaylistModal={setShowCreatePlaylistModal}
        />
      )}
    </main>
  );
}
