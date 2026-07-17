# Search Result Parsing

This document explains how we parse YouTube Music search results into `Track` objects,
mirroring Metrolist's `SearchPage.kt` and `PageHelper.kt` logic.

---

## Response Structure

YouTube Music search results arrive as a deeply nested JSON tree:

```
contents
  .tabbedSearchResultsRenderer
  .tabs[0]
  .tabRenderer
  .content
  .sectionListRenderer
  .contents[]           ← array of "sections"
    .musicShelfRenderer
      .contents[]       ← array of track items
        .musicResponsiveListItemRenderer   ← one track
```

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/pages/SearchPage.kt`
> — `SearchPage.fromMusicShelfRenderer()`

---

## Track Extraction (`extract_track_from_renderer`)

Each parsed item is either a `musicResponsiveListItemRenderer` (used in search results) or a `musicTwoRowItemRenderer` (used in homepage carousels).

### `musicResponsiveListItemRenderer`
- **`flexColumns`** — dynamic width columns
  - **Column 0** — Track title
  - **Column 1+** — Metadata runs: artist names, album, year, view count, duration

### `musicTwoRowItemRenderer`
- **`title`** — Track title (`.title.runs[0].text`)
- **`subtitle`** — Artist and metadata (`.subtitle.runs`)
- **`thumbnailRenderer`** — Thumbnail object

### `fixedColumns` — fixed width columns
- May contain duration in some layouts

---

## Title

```
flexColumns[0]
  .musicResponsiveListItemFlexColumnRenderer
  .text.runs[0].text
```

## Video ID (three fallbacks)

1. `playlistItemData.videoId`
2. `navigationEndpoint.watchEndpoint.videoId`
3. `overlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint.videoId`

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/pages/SearchPage.kt`
> lines 123-132

## Artist Name (`extract_artist_from_runs`)

Scans `flexColumns[1]` runs (or `subtitle` runs for homepage carousels) and finds those with a `browseEndpoint.browseId`
starting with `"UC"` (YouTube channel ID prefix = artist channel).

Falls back to any non-metadata text run that is not a year, view count, or song type label.

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/pages/PageHelper.kt`
> `extractArtists()` function (line 173)

## Duration (`extract_duration`)

**Algorithm (mirrors Metrolist exactly):**
1. Drop `flexColumns[0]` (title column)
2. Flatten all remaining flex column runs into one list
3. For each run text, check `is_duration_text()`:
   - Regex: `\d{1,2}[:.,]\d{2}(?:[:.,]\d{2})?`
   - Accepts `:` `.` `,` as separators (locale-dependent)
4. Parse with `parse_duration_string()` → seconds

**Why locale separators matter:**
YouTube Music returns durations like `"3:45"` in en-US, `"3.45"` in some EU locales,
and `"3,45"` in others. Our parser normalizes all to `:` before splitting.

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/pages/PageHelper.kt`
> `isDurationText()` (line 225), `extractDuration()` (line 205)
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/utils/Utils.kt`
> `String.parseTime()` (line 94)

## Thumbnail (`extract_thumbnail`)

Scans three renderer types for a thumbnail URL:
1. `thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[]` — takes the **last** (highest resolution)
2. `thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails[]`
3. `thumbnail.musicAnimatedThumbnailRenderer.thumbnail.thumbnails[]`

Protocol-relative URLs (starting with `//`) are resolved to `https://` explicitly
so they load correctly inside Tauri's `tauri://` scheme context.

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/models/ThumbnailRenderer.kt`
> `getThumbnailUrl()` — takes `thumbnails.last()` for highest resolution
