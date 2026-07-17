# Bug Fixes & Decisions Log

A chronological log of bugs found and how they were resolved.

---

## [Fix] Duration showed 3:00 for all tracks

**Symptom:** Every search result showed `3:00` regardless of actual song length.

**Root cause (3 issues combined):**
1. The parser only split on `:` but YouTube uses locale-dependent separators (`.` and `,` in some regions)
2. The first `flexColumn` (title) was being scanned instead of being skipped
3. Non-breaking space characters (`\u{a0}`) in text runs were not stripped before matching

**Fix in:** [`lib.rs`](../src-tauri/src/lib.rs) — `parse_duration_string()`, `is_duration_text()`, `extract_duration()`

**Metrolist reference:**
- `PageHelper.kt` → `isDurationText()` uses regex `\d{1,2}[:.,]\d{2}(?:[:.,]\d{2})?`
- `Utils.kt` → `parseTime()` splits on `Regex("[:.,]")`

---

## [Fix] Player bar showed wrong duration (e.g. 6:57 for 4-min song)

**Symptom:** `onLoadedMetadata` from the HTML5 audio element reported wrong duration.

**Root cause:** We were using `audio/webm; codecs="opus"` (WebM adaptive stream).
WebM streams don't embed accurate total-duration metadata in their headers.
The browser's duration estimate for opus/webm can be wildly off.

**Fix in:**
- [`lib.rs`](../src-tauri/src/lib.rs) — `get_yt_stream_direct()` now extracts `approxDurationMs` from the YouTube player response and returns `{ url, duration }` JSON
- [`App.tsx`](../src/App.tsx) — `playTrack()` parses the JSON and sets `duration` state from YouTube's value instead of from `onLoadedMetadata`

**`onLoadedMetadata` is now only a fallback** when YouTube doesn't provide `approxDurationMs`.

---

## [Fix] Seeking was very slow / music got "stuck" after seek

**Symptom:** Dragging the seek slider took several seconds to resume, feeling frozen.

**Root cause:** We were selecting `audio/webm; codecs="opus"` streams.
WebM is a streaming-optimized container with no seek table.
Seeking requires the browser to issue an HTTP range request AND scan forward
through the bitstream to find the nearest keyframe — taking 2-5 seconds.

**Fix in:** [`lib.rs`](../src-tauri/src/lib.rs) — stream selection changed from
`opus (min bitrate)` → `mp4a (max bitrate)`.

MP4 containers store their `moov` seek table at the very beginning of the file.
The browser calculates the exact byte offset for any timestamp instantly and issues
a precise HTTP range request → **sub-100ms seeks**.

Also added `preload="auto"` to the `<audio>` element in [`App.tsx`](../src/App.tsx) to
buffer the full stream in memory after load.

---

## [Fix] Images showed as `?` icon

**Symptom:** Thumbnail images failed to load (showed broken image icon).

**Root cause:** YouTube returns protocol-relative thumbnail URLs starting with `//`
(e.g. `//lh3.googleusercontent.com/...`). Inside Tauri, assets load under the
`tauri://` scheme, so `//lh3...` resolves to `tauri://lh3...` — which fails.

**Fix in:** [`lib.rs`](../src-tauri/src/lib.rs) — `extract_thumbnail()` prepends `https:`
to any URL starting with `//`.

---

## [Fix] Slider seek stopped music entirely

**Symptom:** Dragging the seek slider caused playback to stop completely.

**Root cause:** The `duration` state was wrong (too high — e.g. 6:57 for a 4-min song).
The slider `max` equaled the wrong duration. Dragging to a position beyond the actual
audio stream's end triggered `onended` → `handleNext()`. If no next track existed,
playback stopped.

**Fix:** Duration accuracy fix (see above) solved this indirectly. The slider `max`
is now the correct value from `approxDurationMs`.

---

## [Fix] Login required / bot detection (`LOGIN_REQUIRED`)

**Symptom:** Player requests returned `"status": "LOGIN_REQUIRED"` with reason
`"Sign in to confirm you're not a bot"`.

**Root cause:** Sending player requests without a prior search session context
— Google requires proof that the client is part of a real browsing session.

**Fix in:** [`lib.rs`](../src-tauri/src/lib.rs):
1. After every search, extract `responseContext.visitorData` and store in global `VISITOR_DATA: Mutex<String>`
2. Inject `visitorData` into every player request context

This proves the player request is part of the same browsing session as the search.

**Additionally:** Using the `ANDROID_VR` client profile returns unencrypted stream URLs,
avoiding the need to solve YouTube's signature cipher.

> **Metrolist reference:**
> `YouTubeClient.kt` → `ANDROID_VR_NO_AUTH` entry with `useSignatureTimestamp = false`

---

## [Decision] `rustls-tls` for native HTTPS

Added `features = ["json", "rustls-tls"]` to `reqwest` in `Cargo.toml`.

This bundles Mozilla's root CA certificates inside the Rust binary so HTTPS
works correctly from the Tauri sandbox without relying on the macOS system keychain.
