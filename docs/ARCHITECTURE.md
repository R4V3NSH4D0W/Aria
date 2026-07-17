# Architecture Overview

This app is a native macOS desktop YouTube Music player built with:

- **Tauri** — Desktop shell (Rust backend + WebView frontend)
- **React + TypeScript** — UI layer (`src/`)
- **Rust (Tokio + reqwest)** — YouTube Music API calls (`src-tauri/src/lib.rs`)

## Reference Project

This app is modelled after [Metrolist](file:///Volumes/Extended/desktop_apps/Metrolist), the local MetroList project, an Android YouTube Music client written in Kotlin.
Its InnerTube layer lives at:

```
/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/
```

---

## Data Flow

```
User clicks Search
       │
       ▼
App.tsx: invoke("search_yt_direct", { query })
       │
       ▼
lib.rs: POST music.youtube.com/youtubei/v1/search
        (WEB_REMIX client, captures visitorData session)
       │
       ▼
lib.rs: parse_search_results() → Vec<Track>
       │
       ▼
App.tsx: renders search results list

User clicks Track
       │
       ▼
App.tsx: invoke("get_yt_stream_direct", { videoId })
       │
       ▼
lib.rs: POST www.youtube.com/youtubei/v1/player
        (ANDROID_VR client, injects visitorData)
        Returns JSON { url, duration }
       │
       ▼
App.tsx: sets <audio src={url}>, sets duration state
```

---

## Key Files

| File | Purpose |
|------|---------|
| [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs) | All Rust backend logic: search, stream extraction, metadata parsing |
| [`src/App.tsx`](../src/App.tsx) | Full React UI: search results, player bar, playlists, favorites |
| [`src/index.css`](../src/index.css) | Global styles and Tailwind utilities |
| [`src-tauri/Cargo.toml`](../src-tauri/Cargo.toml) | Rust dependencies (reqwest with rustls-tls) |
