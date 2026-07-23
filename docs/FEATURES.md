# Aria Music Player - Feature List

Aria is a premium desktop music player built on Tauri, React, and Rust, integrating directly with YouTube Music to provide an immersive listening experience. Here is a list of all features currently supported:

---

## 🎵 Core Playback & Streaming
*   **Direct YouTube Music Streaming:** Bypasses standard streaming constraints by resolving unencrypted stream URLs directly from YouTube client endpoints via the Rust backend.
*   **Throttling Bypass:** Downloads stream data in concurrent 1MB chunks to bypass YouTube's playback speed throttling.
*   **Player Controls:** Play, pause, skip forward/backward, seek bar with precise time tracking, mute toggle, hover-activated vertical volume slider, and expandable hover-reveal utility toolbox.
*   **Shuffle Playback:** Randomizes the queue or active playlist.
*   **3-State Repeat System:**
    *   **Repeat Off (`none`):** Plays through the queue/playlist and pauses at the end.
    *   **Repeat All (`all`):** Loops the entire active queue/playlist continuously.
    *   **Repeat One (`one`):** Continuously repeats the current track.
*   **Sleep Timer:** Set a sleep countdown (15m, 30m, 45m, 60m) or stop playback at the **End of current song**. Displays countdown/status in the control bar.
*   **5-Band Graphic Equalizer:** Shape sound frequencies in real-time. Features individual gain controls (-12 to +12 dB) for 60Hz, 230Hz, 910Hz, 4kHz, and 14kHz bands, with preset options (Bass Boost, Classical, Pop, Electronic, Rock, Vocal Boost, Podcast, and Custom).
*   **Discord Rich Presence (RPC):** Show what song you are listening to on your Discord profile in real-time. Displays the track title, artist, live elapsed/remaining countdown timer, and high-quality album artwork thumbnail with automatic play/pause state synchronization.

---

## 📥 Offline Caching & Downloads
*   **Track Downloading:** Download tracks directly to local storage as `.m4a` files for offline listening.
*   **Downloads Management:** A dedicated **Downloads** section in the sidebar to view, play, and delete cached tracks.
*   **Automatic Cleanup:** Intelligently deletes local files from disk when a track is removed from both Favorites and all local playlists, preventing orphan files.
*   **Download All:** Easily download all tracks in Favorites or custom playlists with a single click.

---

## 📂 Library & Playlist Management
*   **Custom Playlists:** Create, rename, delete, and add songs to custom local playlists.
*   **Favorites:** Mark songs as favorites (adds them to the Favorites library page).
*   **Recently Played:** Keeps a history of the last 100 tracks played, automatically adding tracks after they have been listened to for 30 seconds (or 90% for short tracks).
*   **Sorting Options:** Sort favorites by recently added, oldest added, or alphabetically by title.

---

## ☁️ YouTube Music Integration
*   **Authenticated Integration:** Supports logging in by importing YouTube session cookies to access personal user data securely.
*   **User Playlists:** Syncs and loads your personal YouTube playlists directly into the application.
*   **YouTube Radios:** Generate and auto-cache radio mixes from seed tracks. Includes a dedicated section in the sidebar for saved radios.
*   **Artist Subscriptions:** Subscribe to artists, view detailed artist profiles, and pin favorite artists in the sidebar.

---

## 🎤 Immersive UI & Lyrics
*   **Full-Screen Immersive Lyrics Overlay:** High-performance overlay displaying track lyrics.
*   **Karaoke Mode:** Synchronizes and highlights lyrics dynamically alongside the audio's progress.
*   **Dynamic Custom Wallpapers:** Configure custom background wallpaper URLs and control their opacity directly from the Settings panel.
*   **Draggable Title Bar:** Custom window drag region matching desktop environment expectations.
*   **Auto-Updating Sidebar:** Automatically collapses on narrow screens and expands on wide screens unless manually closed by the user.
*   **Mini Mode (Mini Player):** Shrinks the application window down to a floating picture-in-picture window (`320x340`) set to "Always on Top" with custom simplified playback controls, window dragging, and artwork display.

---

## ⌨️ Keyboard Shortcuts
Control the entire player with global keyboard shortcuts:
*   `Space`: Play / Pause toggle.
*   `Arrow Left` / `Arrow Right`: Seek backward/forward by 5 seconds (Hold `Ctrl`/`Cmd` to skip to Prev/Next track).
*   `Arrow Up` / `Arrow Down`: Adjust volume.
*   `M`: Mute / Unmute audio.
*   `L`: Add / Remove track from Favorites.
*   `S`: Toggle Shuffle on/off.
*   `R`: Cycle Repeat modes (`None` ➔ `Repeat All` ➔ `Repeat One` ➔ `None`).

---

## 🔄 Updates & Diagnostics
*   **Automatic Update Checker:** Automatically checks for the latest version releases and displays release notes inside the application settings.
*   **Offline Mode Detection:** Displays a user-friendly offline banner and changes default behavior if connection is lost.
