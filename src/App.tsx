import { useEffect, useState, useRef } from "react";
import { AlertCircle, WifiOff } from "lucide-react";
import { Track, FavoriteArtist } from "./types";
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
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { useLibrary } from "./hooks/useLibrary";
import { useSearch } from "./hooks/useSearch";
import { useArtist } from "./hooks/useArtist";
import { useHome } from "./hooks/useHome";
import { useKaraoke } from "./hooks/useKaraoke";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import { useExplore } from "./hooks/useExplore";
import { useYtPlaylist } from "./hooks/useYtPlaylist";
import { YtPlaylistsView } from "./components/YtPlaylistsView";
import { MiniPlayer } from "./components/MiniPlayer";
import { YtRadiosView } from "./components/YtRadiosView";
import { FavoriteArtistsView } from "./components/FavoriteArtistsView";
import { SavedRadio } from "./types";
import { startWindowDrag } from "./lib/windowDrag";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

export default function App() {
  const [wallpaperUrl, setWallpaperUrl] = useState(
    () =>
      localStorage.getItem("aria_wallpaper_url") ||
      "https://w.wallhaven.cc/full/6l/wallhaven-6lpkl7.jpg",
  );
  const [wallpaperOpacity, setWallpaperOpacity] = useState(() => {
    const saved = localStorage.getItem("aria_wallpaper_opacity");
    return saved ? parseFloat(saved) : 0.3;
  });

  const [isMiniMode, setIsMiniMode] = useState(false);

  const toggleMiniMode = async () => {
    try {
      const win = getCurrentWindow();
      if (!isMiniMode) {
        await win.setSize(new LogicalSize(320, 340));
        await win.setAlwaysOnTop(true);
        setIsMiniMode(true);
      } else {
        await win.setSize(new LogicalSize(1200, 800));
        await win.setAlwaysOnTop(false);
        setIsMiniMode(false);
      }
    } catch (e) {
      console.error("Failed to toggle mini mode:", e);
    }
  };

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
    toggleSidebar,
    setShowCreatePlaylistModal,
    setNewPlaylistName,
    setActiveDropdownTrackId,
    isFavorite,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    handleTabChange: baseHandleTabChange,
    addTrackToPlaylist,
    removeTrackFromPlaylist: baseRemoveTrackFromPlaylist,
    addToRecentlyPlayed,
    downloadTrack,
    deleteDownload,
  } = useLibrary();

  const removeTrackFromPlaylist = (playlistId: string, videoId: string) => {
    console.log("removeTrackFromPlaylist called with:", playlistId, videoId);
    if (playlistId.startsWith("yt:")) {
      removeYtTrack(videoId);
      if (playlistId.startsWith("yt:RD")) {
        const radioId = playlistId.slice(3);
        setSavedRadios((prev) =>
          prev.map((r) => {
            if (r.id === radioId && r.tracks) {
              const updatedTracks = r.tracks.filter(
                (t) => t.videoId !== videoId,
              );
              const collageThumbnails = updatedTracks
                .slice(0, 4)
                .map((t) => t.thumbnail);
              return {
                ...r,
                tracks: updatedTracks,
                thumbnails: collageThumbnails,
              };
            }
            return r;
          }),
        );
      }
      return;
    }
    baseRemoveTrackFromPlaylist(playlistId, videoId);
  };

  const { showLyricsMode, setShowLyricsMode, karaokeMode, setKaraokeMode } =
    useKaraoke();

  const { hasUpdate, latestVersion, releaseBody } = useUpdateCheck();

  const [savedRadios, setSavedRadios] = useState<SavedRadio[]>(() => {
    try {
      const saved = localStorage.getItem("aria_saved_radios");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("aria_saved_radios", JSON.stringify(savedRadios));
  }, [savedRadios]);

  const [favoriteArtists, setFavoriteArtists] = useState<FavoriteArtist[]>(
    () => {
      try {
        const saved = localStorage.getItem("aria_favorite_artists");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );

  useEffect(() => {
    localStorage.setItem(
      "aria_favorite_artists",
      JSON.stringify(favoriteArtists),
    );
  }, [favoriteArtists]);

  const toggleFavoriteArtist = (artist: {
    browseId: string;
    name: string;
    thumbnail: string;
  }) => {
    setFavoriteArtists((prev) => {
      const exists = prev.some((a) => a.browseId === artist.browseId);
      if (exists) {
        return prev.filter((a) => a.browseId !== artist.browseId);
      } else {
        return [...prev, artist];
      }
    });
  };

  const togglePinArtist = (browseId: string) => {
    setFavoriteArtists((prev) =>
      prev.map((a) =>
        a.browseId === browseId ? { ...a, isPinned: !a.isPinned } : a,
      ),
    );
  };

  const deleteSavedRadio = (radioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedRadios((prev) => prev.filter((r) => r.id !== radioId));
  };

  const renameSavedRadio = (radioId: string, newTitle: string) => {
    setSavedRadios((prev) =>
      prev.map((r) => (r.id === radioId ? { ...r, title: newTitle } : r)),
    );
  };

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
    subscriptionMix,
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
    loadedId,
    removeTrack: removeYtTrack,
  } = useYtPlaylist();

  // Seed videoId to pass to YouTube radio backend (for RDGMEM playlists)
  const ytSeedVideoIdRef = useRef<string | undefined>(undefined);

  // Load YT playlist tracks whenever a yt: tab is activated
  useEffect(() => {
    if (activeTab.startsWith("yt:")) {
      const browseId = activeTab.slice(3); // strip "yt:"
      loadPlaylist(browseId, ytSeedVideoIdRef.current);
    }
  }, [activeTab, loadPlaylist]);

  // Auto-save & update YouTube Radio mixes to our Saved Radios list
  useEffect(() => {
    if (
      activeTab.startsWith("yt:RD") &&
      ytPlaylistTracks.length > 0 &&
      loadedId === activeTab.slice(3)
    ) {
      const radioId = activeTab.slice(3);
      const firstTrack = ytPlaylistTracks[0];
      const collageThumbnails = ytPlaylistTracks
        .slice(0, 4)
        .map((t) => t.thumbnail);

      setSavedRadios((prev) => {
        const existingIndex = prev.findIndex((r) => r.id === radioId);
        if (existingIndex === -1) {
          const newRadio: SavedRadio = {
            id: radioId,
            videoId: radioId.slice(2),
            title: `${firstTrack.title} Radio`,
            thumbnail: firstTrack.thumbnail,
            thumbnails: collageThumbnails,
            tracks: ytPlaylistTracks,
            addedAt: Date.now(),
          };
          return [newRadio, ...prev];
        } else {
          const existingRadio = prev[existingIndex];
          const tracksChanged =
            !existingRadio.tracks ||
            existingRadio.tracks.length !== ytPlaylistTracks.length;
          const thumbsChanged =
            !existingRadio.thumbnails ||
            existingRadio.thumbnails.length !== collageThumbnails.length;
          if (tracksChanged || thumbsChanged) {
            return prev.map((r) =>
              r.id === radioId
                ? {
                    ...r,
                    thumbnails: collageThumbnails,
                    tracks: ytPlaylistTracks,
                  }
                : r,
            );
          }
        }
        return prev;
      });
    }
  }, [activeTab, ytPlaylistTracks, loadedId]);

  const handleTabChange = (tab: string) => {
    baseHandleTabChange(tab);
    setSelectedArtist(null);
  };

  const getActiveTracks = (): Track[] => {
    if (selectedArtist) {
      return selectedArtist.songs;
    }
    if (activeTab === "downloads") {
      return downloads;
    }
    if (activeTab === "recently-played") {
      return recentlyPlayed;
    }
    if (activeTab === "search") {
      return searchResults.filter(
        (item): item is Track => !("type" in item && item.type === "artist"),
      );
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
      if (activeTab.startsWith("yt:RD")) {
        const radioId = activeTab.slice(3);
        const saved = savedRadios.find((r) => r.id === radioId);
        if (saved?.tracks && saved.tracks.length > 0) {
          return saved.tracks;
        }
      }
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
    repeatMode,
    isShuffled,
    playbackError,
    resolvedAudioUrl,
    lyrics,
    lyricsLoading,
    audioRef,
    setIsShuffled,
    setRepeatMode,
    playTrack,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    seekBy,
    adjustVolume,
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
    sleepTimerTimeLeft,
    setSleepTimerTimeLeft,
    sleepAtTrackEnd,
    setSleepAtTrackEnd,
    eqGains,
    setEqGains,
    eqEnabled,
    setEqEnabled,
  } = usePlayback({
    getActiveTracks,
    onTrackPlayed: addToRecentlyPlayed,
    onResolveStateChange: (videoId, isResolving) => {
      setSearchResults((prev) =>
        prev.map((t) =>
          t.type !== "artist" && t.videoId === videoId
            ? { ...t, isResolving }
            : t,
        ),
      );
    },
  });

  usePlayerShortcuts({
    enabled: true,
    currentTrack,
    isShuffled,
    repeatMode,
    togglePlay,
    handleNext,
    handlePrev,
    seekBy,
    adjustVolume,
    toggleMute,
    setIsShuffled,
    setRepeatMode,
    toggleFavorite,
  });

  const hasQueue = queue.length > 0;

  if (isMiniMode) {
    // We handle rendering inside the unified return below to keep the <audio> element mounted.
  }

  return (
    <main
      className={`h-screen w-screen text-slate-100 flex flex-col font-sans relative overflow-hidden select-none transition-colors duration-500 ${isMiniMode ? "bg-[#0a0c10]" : wallpaperUrl ? "bg-[#040506]" : "bg-[#08090a]"}`}
      data-tauri-drag-region
      onMouseDown={startWindowDrag}
    >
      {/* Background Wallpaper Layer */}
      {isMiniMode ? (
        currentTrack?.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover blur-3xl scale-125 opacity-35 pointer-events-none z-0"
          />
        )
      ) : (
        wallpaperUrl && (
          <img
            src={wallpaperUrl}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none z-0 transition-opacity duration-500"
            style={{ opacity: wallpaperOpacity }}
          />
        )
      )}

      {/* Hidden HTML5 Audio Element (Always Mounted) */}
      <audio
        ref={audioRef}
        src={resolvedAudioUrl || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        loop={repeatMode === "one"}
      />

      {isMiniMode ? (
        <MiniPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          handlePrev={handlePrev}
          handleNext={handleNext}
          toggleMiniMode={toggleMiniMode}
          startWindowDrag={startWindowDrag}
        />
      ) : (
        <>
          <div
            data-tauri-drag-region
            onMouseDown={startWindowDrag}
            className="h-11 w-full shrink-0 z-50 cursor-default"
          />

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
              activeTab={
                selectedArtist || artistLoading ? "artist-profile" : activeTab
              }
              setActiveTab={handleTabChange}
              playlists={playlists}
              deletePlaylist={(id, e) => {
                deletePlaylist(id, e);
                setSelectedArtist(null);
              }}
              setShowCreatePlaylistModal={setShowCreatePlaylistModal}
              hasPlayer={!!currentTrack}
              isOpen={isSidebarOpen}
              favoriteArtists={favoriteArtists}
              loadArtist={loadArtist}
            />

            {/* Main Content Area */}
            <section
              className={`flex-1 flex flex-col overflow-y-auto transition-[padding] duration-500 ease-out ${currentTrack ? "pb-36" : ""}`}
            >
              <Header
                activeTab={
                  selectedArtist || artistLoading ? "artist-profile" : activeTab
                }
                playlists={playlists}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                favoriteSort={favoriteSort}
                setFavoriteSort={setFavoriteSort}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                onOpenSettings={() => setActiveTab("settings")}
                ytPlaylists={ytPlaylists}
                savedRadios={savedRadios}
                hasUpdate={hasUpdate}
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
                      <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin -translate-y-5" />
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
                      loadArtist={loadArtist}
                      favoriteArtists={favoriteArtists}
                      toggleFavoriteArtist={toggleFavoriteArtist}
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
                      subscriptionMix={subscriptionMix}
                    />
                  ) : activeTab === "settings" ? (
                    <Settings
                      onPlaylistsSync={setYtPlaylists}
                      wallpaperUrl={wallpaperUrl}
                      setWallpaperUrl={setWallpaperUrl}
                      wallpaperOpacity={wallpaperOpacity}
                      setWallpaperOpacity={setWallpaperOpacity}
                      hasUpdate={hasUpdate}
                      latestVersion={latestVersion}
                      releaseBody={releaseBody}
                      eqGains={eqGains}
                      setEqGains={setEqGains}
                      eqEnabled={eqEnabled}
                      setEqEnabled={setEqEnabled}
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
                      ) : activeTab === "yt-radios" ? (
                        <YtRadiosView
                          savedRadios={savedRadios}
                          onSelectRadio={(id, videoId) => {
                            ytSeedVideoIdRef.current = videoId;
                            setActiveTab(`yt:${id}`);
                          }}
                          onDeleteRadio={deleteSavedRadio}
                          onRenameRadio={renameSavedRadio}
                        />
                      ) : activeTab === "favorite-artists" ? (
                        <FavoriteArtistsView
                          favoriteArtists={favoriteArtists}
                          onSelectArtist={(id) => loadArtist(id)}
                          onUnfavoriteArtist={toggleFavoriteArtist}
                          onTogglePin={togglePinArtist}
                        />
                      ) : ytPlaylistLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                          <div className="w-10 h-10 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin -translate-y-5" />
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
                          loadArtist={loadArtist}
                          downloads={downloads}
                          downloadingTrackIds={downloadingTrackIds}
                          downloadTrack={downloadTrack}
                          deleteDownload={deleteDownload}
                          onBack={
                            activeTab.startsWith("yt:")
                              ? activeTab.startsWith("yt:RD")
                                ? () => setActiveTab("yt-radios")
                                : () => setActiveTab("yt-playlists")
                              : undefined
                          }
                        />
                      )}
                    </>
                  )}
                </div>

                {hasQueue && (
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

          {/* Footer Player — hidden only in karaoke lyrics mode */}
          {currentTrack && !(showLyricsMode && karaokeMode) && (
            <div className="relative z-[80]">
              <Player
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                isShuffled={isShuffled}
                repeatMode={repeatMode}
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
                setRepeatMode={setRepeatMode}
                handleSeek={handleSeek}
                handleVolumeChange={handleVolumeChange}
                handleNext={handleNext}
                handlePrev={handlePrev}
                playlists={playlists}
                addTrackToPlaylist={addTrackToPlaylist}
                setShowCreatePlaylistModal={setShowCreatePlaylistModal}
                showLyricsMode={showLyricsMode}
                setShowLyricsMode={setShowLyricsMode}
                loadArtist={loadArtist}
                sleepTimerTimeLeft={sleepTimerTimeLeft}
                setSleepTimerTimeLeft={setSleepTimerTimeLeft}
                sleepAtTrackEnd={sleepAtTrackEnd}
                setSleepAtTrackEnd={setSleepAtTrackEnd}
                isMiniMode={isMiniMode}
                toggleMiniMode={toggleMiniMode}
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
              karaokeMode={karaokeMode}
              setKaraokeMode={setKaraokeMode}
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
        </>
      )}
    </main>
  );
}
