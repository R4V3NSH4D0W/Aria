Welcome to the `docs/` folder. These documents explain how this YouTube Music desktop
app is built, how it talks to YouTube, and the bugs that were fixed along the way.

---

## Documents

| Document                                 | Description                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)     | Overall app structure, data flow diagram, key files                                |
| [YOUTUBE_API.md](./YOUTUBE_API.md)       | InnerTube API: search endpoint, player endpoint, anti-bot bypass, stream selection |
| [SEARCH_PARSING.md](./SEARCH_PARSING.md) | How search results are parsed: title, artist, duration, thumbnail                  |
| [BUGFIXES.md](./BUGFIXES.md)             | Chronological log of every bug found and how it was fixed                          |

---

## Metrolist Reference Directory

This app is modelled after **Metrolist**, an open-source Android YouTube Music client.
Many of the parsing and API patterns are directly ported from its Kotlin `innertube` module.

```
/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/
```

### Key files to reference

| Metrolist File                | What to look for                                                                |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `models/YouTubeClient.kt`     | Client profiles: `ANDROID_VR`, `ANDROID_VR_NO_AUTH`, `WEB_REMIX`                |
| `pages/SearchPage.kt`         | How search response JSON is traversed; `isSong`, `isEpisode` checks             |
| `pages/PageHelper.kt`         | `extractArtists()`, `extractDuration()`, `isDurationText()`, `isMetadataText()` |
| `models/ThumbnailRenderer.kt` | `getThumbnailUrl()` — takes `thumbnails.last()` for max resolution              |
| `utils/Utils.kt`              | `String.parseTime()` — locale-aware duration parser                             |
| `YouTube.kt`                  | Top-level API calls; `visitorData` session handling                             |

---

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Run in dev mode (hot reload)
pnpm tauri dev

# Build for production
pnpm tauri build
```

Rust backend changes require the Tauri dev server to recompile Rust (automatic, ~30s).
Frontend changes are hot-reloaded instantly via Vite HMR.
