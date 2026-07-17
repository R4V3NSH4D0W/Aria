# YouTube Music API Integration

This document explains how the app talks to YouTube Music's internal `InnerTube` API,
and how we bypass bot detection — mirroring Metrolist's approach exactly.

---

## 1. Search (`search_yt_direct`)

**Endpoint:** `POST https://music.youtube.com/youtubei/v1/search`

**Client profile used:** `WEB_REMIX`

## 1.5 Homepage Fetching (`get_yt_home`)

**Endpoint:** `POST https://music.youtube.com/youtubei/v1/browse`

**Client profile used:** `WEB_REMIX`

```json
{
  "context": {
    "client": {
      "clientName": "WEB_REMIX",
      "clientVersion": "1.20260114.03.00",
      "hl": "en",
      "gl": "US"
    }
  },
  "browseId": "FEmusic_home"
}
```

The response contains a `sectionListRenderer` with a series of `musicCarouselShelfRenderer` elements, which are parsed into `HomeSection` objects.

---

```json
{
  "context": {
    "client": {
      "clientName": "WEB_REMIX",
      "clientVersion": "1.20260114.03.00",
      "hl": "en",
      "gl": "US"
    }
  },
  "query": "<search term>"
}
```

### Anti-bot session (`visitorData`)

Google issues a `visitorData` token in every search response under:
```
response.responseContext.visitorData
```

We store this globally in `VISITOR_DATA: Mutex<String>` in `lib.rs` and inject it
into every subsequent player request to prove request sequence context.

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/YouTube.kt`
> — see `val visitorData` field

---

## 2. Stream Extraction (`get_yt_stream_direct`)

**Endpoint:** `POST https://www.youtube.com/youtubei/v1/player`

**Client profile used:** `ANDROID_VR` (version `1.61.48`)

This client is key — it returns **direct, unencrypted stream URLs** without requiring
signature cipher solving. Metrolist calls this `ANDROID_VR_NO_AUTH`.

```json
{
  "context": {
    "client": {
      "clientName": "ANDROID_VR",
      "clientVersion": "1.61.48",
      "userAgent": "com.google.android.apps.youtube.vr.oculus/1.61.48 ...",
      "hl": "en",
      "gl": "US",
      "visitorData": "<captured from search response>"
    }
  },
  "videoId": "<video id>"
}
```

> **Metrolist reference:**
> `/Volumes/Extended/desktop_apps/Metrolist/innertube/src/main/kotlin/com/metrolist/innertube/models/YouTubeClient.kt`
> — see `ANDROID_VR` and `ANDROID_VR_NO_AUTH` entries

### Stream Format Selection

The player response includes `streamingData.adaptiveFormats[]`, each with:
- `mimeType` — e.g. `"audio/mp4; codecs=\"mp4a.40.2\""` or `"audio/webm; codecs=\"opus\""`
- `bitrate` — bits per second
- `approxDurationMs` — **authoritative duration** (milliseconds as string)
- `url` — direct CDN URL (no signature needed with ANDROID_VR client)

**We select: highest-bitrate `mp4a` (AAC) format.**

Reason: MP4 containers store their seek table (`moov` atom) at the file start,
enabling instant HTTP range-request seeks. WebM/opus requires scanning forward
to find keyframes, causing multi-second seek stall.

### Return value

The Rust command returns a JSON string:
```json
{ "url": "https://...", "duration": 240 }
```

The frontend parses this JSON and:
- Sets `<audio src={url}>`
- Sets `duration` state from the YouTube-provided value (not from `onLoadedMetadata`)

---

## 3. SSL/TLS

`reqwest` is configured with `rustls-tls` feature in `Cargo.toml`:
```toml
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
```

This bundles Mozilla's root certificates directly in the Rust binary,
so HTTPS works in the Tauri sandbox without system certificate trust issues.
