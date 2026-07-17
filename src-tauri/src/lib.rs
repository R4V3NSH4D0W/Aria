use serde_json::Value;
use std::sync::Mutex;

// Global storage for YouTube visitor/session token
static VISITOR_DATA: Mutex<String> = Mutex::new(String::new());

fn extract_artist_from_runs(runs: &Vec<Value>) -> String {
    // 1. Try to find a run linked to an artist/channel page (browseId starting with UC or FEs)
    for run in runs {
        if let Some(browse_id) = run.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|v| v.as_str()) {
            if browse_id.starts_with("UC") || browse_id.starts_with("FEs") {
                if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                    return text.trim().to_string();
                }
            }
        }
    }

    // 2. Fallback: filter out types, delimiters, and duration indicators
    for run in runs {
        if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
            let t_trimmed = text.trim();
            if t_trimmed != "•" 
                && t_trimmed != "·" 
                && t_trimmed != ","
                && t_trimmed != "Song" 
                && t_trimmed != "Video" 
                && t_trimmed != "Album"
                && !t_trimmed.contains(':')
                && !t_trimmed.chars().all(char::is_numeric)
            {
                return t_trimmed.to_string();
            }
        }
    }

    "Unknown Artist".to_string()
}

fn extract_thumbnail(item_renderer: &Value) -> String {
    let thumbnails_opt = item_renderer.pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .or_else(|| item_renderer.pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails"))
        .or_else(|| item_renderer.pointer("/thumbnail/croppedSquareThumbnailRenderer/thumbnail/thumbnails"))
        .or_else(|| item_renderer.pointer("/thumbnail/musicAnimatedThumbnailRenderer/backupRenderer/thumbnail/thumbnails"))
        .and_then(|t| t.as_array());

    if let Some(thumbnails) = thumbnails_opt {
        if !thumbnails.is_empty() {
            // Get the last (highest resolution) thumbnail
            if let Some(url) = thumbnails.last().and_then(|t| t.get("url")).and_then(|u| u.as_str()) {
                // Ensure protocol is present
                if url.starts_with("//") {
                    return format!("https:{}", url);
                }
                return url.to_string();
            }
        }
    }

    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300".to_string()
}

/// Parse a duration string with locale-aware separators (: . ,) into seconds.
/// Matches Metrolist's String.parseTime() in Utils.kt exactly.
fn parse_duration_string(text: &str) -> Option<u32> {
    // Replace locale-dependent separators (. and ,) with : then split
    let normalized = text.replace(['.', ','], ":");
    let parts: Vec<&str> = normalized.split(':').collect();
    if parts.len() == 2 {
        let mins = parts[0].trim().parse::<u32>().ok()?;
        let secs = parts[1].trim().parse::<u32>().ok()?;
        Some(mins * 60 + secs)
    } else if parts.len() == 3 {
        let hours = parts[0].trim().parse::<u32>().ok()?;
        let mins = parts[1].trim().parse::<u32>().ok()?;
        let secs = parts[2].trim().parse::<u32>().ok()?;
        Some(hours * 3600 + mins * 60 + secs)
    } else {
        None
    }
}

/// Matches Metrolist's String.isDurationText() in PageHelper.kt:
///   matches(Regex("""\d{1,2}[:.,]\d{2}(?:[:.,]\d{2})?"""))
fn is_duration_text(text: &str) -> bool {
    // Allow non-breaking space prefix/suffix (YouTube adds \u00a0)
    let t = text.trim().trim_matches('\u{a0}');
    // Pattern: 1-2 digits, separator, exactly 2 digits, optionally another separator + 2 digits
    let bytes = t.as_bytes();
    let len = bytes.len();
    // Minimum is "0:00" = 4 chars, maximum is "99:59:59" = 8 chars
    if len < 4 || len > 8 { return false; }
    // Check with regex-like manual parse
    // Try MM:SS
    if len == 4 || len == 5 {
        // e.g. "3:45" or "12:45"
        let sep_pos = t.find(|c| c == ':' || c == '.' || c == ',');
        if let Some(pos) = sep_pos {
            let left = &t[..pos];
            let right = &t[pos+1..];
            if left.len() >= 1 && left.len() <= 2 && right.len() == 2
                && left.chars().all(|c| c.is_ascii_digit())
                && right.chars().all(|c| c.is_ascii_digit())
            {
                return true;
            }
        }
    }
    // Try HH:MM:SS
    if len >= 6 && len <= 8 {
        let parts: Vec<&str> = t.splitn(3, |c| c == ':' || c == '.' || c == ',').collect();
        if parts.len() == 3 {
            return parts[0].len() >= 1 && parts[0].len() <= 2
                && parts[1].len() == 2 && parts[2].len() == 2
                && parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit()));
        }
    }
    false
}

fn extract_duration(item_renderer: &Value) -> u32 {
    // Mirror Metrolist SearchPage.kt lines 117-119:
    //   val metadataRuns = renderer.flexColumns
    //     .drop(1)
    //     .flatMap { it.musicResponsiveListItemFlexColumnRenderer.text?.runs.orEmpty() }
    //   duration = PageHelper.extractDuration(metadataRuns)
    //
    // i.e. drop column 0 (title), flatten ALL remaining flex columns, scan each run.

    if let Some(flex_cols) = item_renderer.get("flexColumns").and_then(|c| c.as_array()) {
        for (idx, col) in flex_cols.iter().enumerate() {
            if idx == 0 { continue; } // drop title column
            if let Some(runs) = col.pointer("/musicResponsiveListItemFlexColumnRenderer/text/runs").and_then(|r| r.as_array()) {
                for run in runs {
                    if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                        let t = text.trim().trim_matches('\u{a0}');
                        println!("  [flexCol {}] raw text: {:?}  is_duration={}", idx, t, is_duration_text(t));
                        if is_duration_text(t) {
                            if let Some(secs) = parse_duration_string(t) {
                                println!("    Found duration in flexCol[{}]: '{}' = {}s", idx, t, secs);
                                return secs;
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback: fixedColumns (some layouts put duration here)
    if let Some(fixed_cols) = item_renderer.get("fixedColumns").and_then(|c| c.as_array()) {
        for col in fixed_cols {
            if let Some(runs) = col.pointer("/musicResponsiveListItemFixedColumnRenderer/text/runs").and_then(|r| r.as_array()) {
                for run in runs {
                    if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                        let t = text.trim().trim_matches('\u{a0}');
                        println!("  [fixedCol] raw text: {:?}  is_duration={}", t, is_duration_text(t));
                        if is_duration_text(t) {
                            if let Some(secs) = parse_duration_string(t) {
                                println!("    Found duration in fixedCol: '{}' = {}s", t, secs);
                                return secs;
                            }
                        }
                    }
                }
            }
        }
    }

    0 // Return 0 (unknown) rather than fake 180 — the UI can handle this
}

fn is_episode(item_renderer: &Value) -> bool {
    // Mirror Metrolist's MusicResponsiveListItemRenderer.isEpisode — 3 detection methods
    // Reference: models/MusicResponsiveListItemRenderer.kt lines 52-85

    // Method 1: navigationEndpoint.browseEndpoint page type == NON_MUSIC_AUDIO_TRACK_PAGE
    if let Some(page_type) = item_renderer
        .pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType")
        .and_then(|v| v.as_str())
    {
        if page_type == "MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE"
            || page_type == "MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE"
        {
            return true;
        }
    }

    // Method 2: first run of flex column 1 has text "Episode"
    if let Some(first_text) = item_renderer
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
    {
        if first_text == "Episode" {
            return true;
        }
    }

    // Method 3: any run in flex column 1 links to a PODCAST_SHOW_DETAIL_PAGE
    if let Some(runs) = item_renderer
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .and_then(|v| v.as_array())
    {
        let has_podcast_link = runs.iter().any(|run| {
            run.pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType")
                .and_then(|v| v.as_str())
                == Some("MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE")
        });
        if has_podcast_link {
            return true;
        }
    }

    false
}

fn is_artist(item_renderer: &Value) -> bool {
    if let Some(page_type) = item_renderer
        .pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType")
        .and_then(|v| v.as_str())
    {
        if page_type == "MUSIC_PAGE_TYPE_ARTIST" || page_type == "MUSIC_PAGE_TYPE_LIBRARY_ARTIST" {
            return true;
        }
    }
    false
}

fn is_user_channel(item_renderer: &Value) -> bool {
    if let Some(page_type) = item_renderer
        .pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType")
        .and_then(|v| v.as_str())
    {
        if page_type == "MUSIC_PAGE_TYPE_USER_CHANNEL" {
            return true;
        }
    }
    false
}

fn extract_artist_from_renderer(item_renderer: &Value) -> Option<serde_json::Value> {
    if !is_artist(item_renderer) && !is_user_channel(item_renderer) {
        return None;
    }
    
    let title = item_renderer.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .or_else(|| item_renderer.pointer("/title/runs/0/text"))
        .and_then(|v| v.as_str())?;

    let browse_id = item_renderer.pointer("/navigationEndpoint/browseEndpoint/browseId")
        .and_then(|v| v.as_str())?;

    let thumbnail = extract_thumbnail(item_renderer);

    let mut shuffle_playlist_id = None;
    if let Some(menu_items) = item_renderer.pointer("/menu/menuRenderer/items").and_then(|i| i.as_array()) {
        for item in menu_items {
            if let Some(icon_type) = item.pointer("/menuNavigationItemRenderer/icon/iconType").and_then(|i| i.as_str()) {
                if icon_type == "MUSIC_SHUFFLE" {
                    if let Some(pl_id) = item.pointer("/menuNavigationItemRenderer/navigationEndpoint/watchPlaylistEndpoint/playlistId").and_then(|p| p.as_str()) {
                        shuffle_playlist_id = Some(pl_id.to_string());
                    }
                }
            }
        }
    }

    Some(serde_json::json!({
        "type": "artist",
        "browseId": browse_id,
        "title": title,
        "thumbnail": thumbnail,
        "shufflePlaylistId": shuffle_playlist_id
    }))
}

fn extract_track_from_renderer(item_renderer: &Value) -> Option<serde_json::Value> {
    // Skip episodes, podcasts, and non-music audio — only keep songs
    // Mirrors Metrolist SearchPage.kt: isEpisode is checked BEFORE isSong
    if is_episode(item_renderer) {
        return None;
    }

    let title = item_renderer.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .or_else(|| item_renderer.pointer("/title/runs/0/text"))
        .and_then(|v| v.as_str())?;

    // Check both playlistItemData and watchEndpoint for videoId
    let video_id = item_renderer.pointer("/playlistItemData/videoId")
        .and_then(|v| v.as_str())
        .or_else(|| item_renderer.pointer("/navigationEndpoint/watchEndpoint/videoId").and_then(|v| v.as_str()))
        .or_else(|| item_renderer.pointer("/overlay/musicItemThumbnailOverlayRenderer/content/musicPlayButtonRenderer/playNavigationEndpoint/watchEndpoint/videoId").and_then(|v| v.as_str()))?;

    // Extract artist name robustly matching Metrolist logic
    let mut artist = "Unknown Artist".to_string();
    if let Some(runs) = item_renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs")
        .or_else(|| item_renderer.pointer("/subtitle/runs"))
        .and_then(|r| r.as_array()) {
        artist = extract_artist_from_runs(runs);
    }

    let thumbnail = extract_thumbnail(item_renderer);
    let duration_secs = extract_duration(item_renderer);

    Some(serde_json::json!({
        "type": "track",
        "title": title,
        "videoId": video_id,
        "uploaderName": artist,
        "duration": duration_secs,
        "thumbnail": thumbnail
    }))
}

// Helper to extract tracks/artists from InnerTube search response
fn parse_search_results(data: &Value) -> Vec<serde_json::Value> {
    let mut results = Vec::new();
    
    // Extract visitorData to bypass bot detection on subsequent player requests
    if let Some(v_data) = data.pointer("/responseContext/visitorData").and_then(|v| v.as_str()) {
        if let Ok(mut guard) = VISITOR_DATA.lock() {
            *guard = v_data.to_string();
            println!("Saved visitorData for session: {}", v_data);
        }
    }

    // Path: contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents
    if let Some(contents) = data.pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents") {
        if let Some(sections) = contents.as_array() {
            for section in sections {
                // 1. Try musicShelfRenderer
                if let Some(shelf_renderer) = section.get("musicShelfRenderer") {
                    if let Some(contents_list) = shelf_renderer.get("contents").and_then(|c| c.as_array()) {
                        for (item_idx, item) in contents_list.iter().enumerate() {
                            if let Some(item_renderer) = item.get("musicResponsiveListItemRenderer") {
                                if item_idx == 0 {
                                    println!("First musicShelfRenderer item JSON:\n{}", serde_json::to_string_pretty(item_renderer).unwrap());
                                }
                                if let Some(track) = extract_track_from_renderer(item_renderer) {
                                    results.push(track);
                                } else if let Some(artist) = extract_artist_from_renderer(item_renderer) {
                                    results.push(artist);
                                }
                            }
                        }
                    }
                }
                // 2. Try itemSectionRenderer
                else if let Some(item_section) = section.get("itemSectionRenderer") {
                    if let Some(contents_list) = item_section.get("contents").and_then(|c| c.as_array()) {
                        for (item_idx, item) in contents_list.iter().enumerate() {
                            if let Some(item_renderer) = item.get("musicResponsiveListItemRenderer") {
                                if item_idx == 0 {
                                    println!("First itemSectionRenderer item JSON:\n{}", serde_json::to_string_pretty(item_renderer).unwrap());
                                }
                                if let Some(track) = extract_track_from_renderer(item_renderer) {
                                    results.push(track);
                                } else if let Some(artist) = extract_artist_from_renderer(item_renderer) {
                                    results.push(artist);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    results
}

fn parse_home_results(data: &Value) -> Vec<serde_json::Value> {
    let mut sections = Vec::new();

    // Extract visitorData to bypass bot detection on subsequent player requests
    if let Some(v_data) = data.pointer("/responseContext/visitorData").and_then(|v| v.as_str()) {
        if let Ok(mut guard) = VISITOR_DATA.lock() {
            *guard = v_data.to_string();
        }
    }

    if let Some(contents) = data.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents") {
        if let Some(carousels) = contents.as_array() {
            for carousel_wrapper in carousels {
                if let Some(carousel) = carousel_wrapper.get("musicCarouselShelfRenderer") {
                    let title = carousel.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Featured");

                    let mut tracks = Vec::new();
                    if let Some(items) = carousel.get("contents").and_then(|c| c.as_array()) {
                        for item in items {
                            let renderer = item.get("musicResponsiveListItemRenderer")
                                .or_else(|| item.get("musicTwoRowItemRenderer"));
                            
                            if let Some(item_renderer) = renderer {
                                if let Some(track) = extract_track_from_renderer(item_renderer) {
                                    tracks.push(track);
                                }
                            }
                        }
                    }
                    
                    if !tracks.is_empty() {
                        sections.push(serde_json::json!({
                            "title": title,
                            "items": tracks
                        }));
                    }
                }
            }
        }
    }
    sections
}

#[tauri::command]
async fn get_yt_home() -> Result<Vec<Value>, String> {
    println!("Fetching YouTube Music Home");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "browseId": "FEmusic_home"
    });

    let res = client.post("https://music.youtube.com/youtubei/v1/browse")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Browse request failed: {}", e))?;

    let data = res.json::<Value>().await.map_err(|e| format!("Failed to parse response: {}", e))?;
    let sections = parse_home_results(&data);
    Ok(sections)
}

#[tauri::command]
async fn search_yt_direct(query: String) -> Result<Vec<Value>, String> {
    println!("search_yt_direct query: {}", query);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Prepare payload context matching Metrolist WEB_REMIX client
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "query": query
    });

    let res = client.post("https://music.youtube.com/youtubei/v1/search")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| {
            println!("search error: {}", e);
            format!("Search request failed: {}", e)
        })?;

    let data = res.json::<Value>()
        .await
        .map_err(|e| {
            println!("search json parse error: {}", e);
            format!("Failed to parse search response: {}", e)
        })?;

    let results = parse_search_results(&data);
    println!("search_yt_direct found {} results", results.len());
    Ok(results)
}

async fn ensure_visitor_data(client: &reqwest::Client) -> String {
    let current = if let Ok(guard) = VISITOR_DATA.lock() {
        guard.clone()
    } else {
        "".to_string()
    };
    if !current.is_empty() {
        return current;
    }

    println!("visitorData is empty, fetching a new session token...");
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "query": "music"
    });

    if let Ok(res) = client.post("https://music.youtube.com/youtubei/v1/search")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json")
        .send()
        .await 
    {
        if let Ok(data) = res.json::<serde_json::Value>().await {
            if let Some(v_data) = data.pointer("/responseContext/visitorData").and_then(|v| v.as_str()) {
                if let Ok(mut guard) = VISITOR_DATA.lock() {
                    *guard = v_data.to_string();
                }
                println!("Successfully generated new visitorData: {}", v_data);
                return v_data.to_string();
            } else {
                println!("Failed to find visitorData in response: {:?}", data.pointer("/responseContext"));
            }
        }
    }
    "".to_string()
}

#[tauri::command]
async fn get_yt_stream_direct(video_id: String) -> Result<String, String> {
    println!("get_yt_stream_direct video_id: {}", video_id);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Load or fetch active visitorData session token
    let visitor_data = ensure_visitor_data(&client).await;
    println!("Using session visitorData: {}", visitor_data);

    // Context including active visitorData to bypass LOGIN_REQUIRED anti-bot blocks
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "ANDROID_VR",
                "clientVersion": "1.61.48",
                "userAgent": "com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Oculus Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)",
                "hl": "en",
                "gl": "US",
                "visitorData": visitor_data
            }
        },
        "videoId": video_id
    });

    let res = client.post("https://www.youtube.com/youtubei/v1/player")
        .json(&payload)
        .header("User-Agent", "com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Oculus Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)")
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| {
            println!("player request error: {}", e);
            format!("Player request failed: {}", e)
        })?;

    let data = res.json::<Value>()
        .await
        .map_err(|e| {
            println!("player json parse error: {}", e);
            format!("Failed to parse player response: {}", e)
        })?;

    if let Some(status) = data.pointer("/playabilityStatus") {
        println!("playabilityStatus: {:?}", status);
    }

    // Pick best audio stream from adaptiveFormats.
    // YouTube returns approxDurationMs which is authoritative — use it.
    // Prefer opus (webm) for lowest bitrate, fallback to mp4a.
    struct AudioCandidate {
        url: String,
        bitrate: u64,
        duration_ms: u64,
        mime_type: String,
    }

    let mut candidates: Vec<AudioCandidate> = Vec::new();

    if let Some(formats) = data.pointer("/streamingData/adaptiveFormats").and_then(|f| f.as_array()) {
        for format in formats {
            let mime_type = format.get("mimeType").and_then(|m| m.as_str()).unwrap_or("").to_string();
            if !mime_type.starts_with("audio/") { continue; }
            if let Some(url) = format.get("url").and_then(|u| u.as_str()) {
                let bitrate = format.get("bitrate").and_then(|b| b.as_u64()).unwrap_or(0);
                let duration_ms = format.get("approxDurationMs")
                    .and_then(|d| d.as_str()).and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);
                println!("  Audio format: mime={} bitrate={} duration_ms={}", mime_type, bitrate, duration_ms);
                candidates.push(AudioCandidate { url: url.to_string(), bitrate, duration_ms, mime_type });
            }
        }
    }

    // Fallback: muxed formats (video+audio)
    if candidates.is_empty() {
        if let Some(formats) = data.pointer("/streamingData/formats").and_then(|f| f.as_array()) {
            for format in formats {
                let mime_type = format.get("mimeType").and_then(|m| m.as_str()).unwrap_or("").to_string();
                if let Some(url) = format.get("url").and_then(|u| u.as_str()) {
                    let bitrate = format.get("bitrate").and_then(|b| b.as_u64()).unwrap_or(0);
                    let duration_ms = format.get("approxDurationMs")
                        .and_then(|d| d.as_str()).and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0);
                    candidates.push(AudioCandidate { url: url.to_string(), bitrate, duration_ms, mime_type });
                }
            }
        }
    }

    if candidates.is_empty() {
        if let Some(streaming_data) = data.pointer("/streamingData") {
            if let Some(sd_obj) = streaming_data.as_object() {
                println!("streamingData keys: {:?}", sd_obj.keys().collect::<Vec<_>>());
            }
        } else {
            println!("streamingData key is missing completely in response");
        }
        return Err("Could not find any suitable unencrypted audio stream".to_string());
    }

    // Pick: prefer highest-bitrate mp4a (AAC) — MP4 container supports instant seeks via HTTP ranges.
    // WebM/opus requires scanning forward to keyframes which causes slow/stuck seeking.
    let best = candidates.iter()
        .filter(|c| c.mime_type.contains("mp4a"))
        .max_by_key(|c| c.bitrate)
        .or_else(|| candidates.iter().max_by_key(|c| c.bitrate));

    if let Some(candidate) = best {
        let duration_secs = if candidate.duration_ms > 0 {
            candidate.duration_ms / 1000
        } else {
            0
        };
        println!("Selected stream: mime={} duration_secs={}", candidate.mime_type, duration_secs);
        // Return JSON with url + duration so frontend uses exact YouTube duration
        let result = serde_json::json!({
            "url": candidate.url,
            "duration": duration_secs
        });
        return Ok(result.to_string());
    }

    Err("Could not find any suitable unencrypted audio stream".to_string())
}
#[tauri::command]
async fn get_yt_artist(browse_id: String) -> Result<Value, String> {
    println!("get_yt_artist browse_id: {}", browse_id);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "browseId": browse_id
    });

    let res = client.post("https://music.youtube.com/youtubei/v1/browse")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Artist browse request failed: {}", e))?;

    let data = res.json::<Value>().await.map_err(|e| format!("Failed to parse artist response: {}", e))?;

    // Parse artist page details
    let mut name = "Unknown Artist".to_string();
    let mut thumbnail = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300".to_string();
    let mut description = "".to_string();
    let mut subscribers = "".to_string();

    // Extract header info
    if let Some(header) = data.get("header") {
        if let Some(immersive) = header.get("musicImmersiveHeaderRenderer") {
            if let Some(title_text) = immersive.pointer("/title/runs/0/text").and_then(|v| v.as_str()) {
                name = title_text.to_string();
            }
            thumbnail = extract_thumbnail(immersive);
            if let Some(sub_text) = immersive.pointer("/subscriptionButton/subscribeButtonRenderer/subscriberCountWithSubscribeText/runs/0/text")
                .or_else(|| immersive.pointer("/subscriptionButton/subscribeButtonRenderer/longSubscriberCountText/runs/0/text"))
                .or_else(|| immersive.pointer("/subscriptionButton/subscribeButtonRenderer/shortSubscriberCountText/runs/0/text"))
                .and_then(|v| v.as_str()) {
                subscribers = sub_text.to_string();
            }
        } else if let Some(visual) = header.get("musicVisualHeaderRenderer") {
            if let Some(title_text) = visual.pointer("/title/runs/0/text").and_then(|v| v.as_str()) {
                name = title_text.to_string();
            }
            thumbnail = extract_thumbnail(visual);
        } else if let Some(music_header) = header.get("musicHeaderRenderer") {
            if let Some(title_text) = music_header.pointer("/title/runs/0/text").and_then(|v| v.as_str()) {
                name = title_text.to_string();
            }
        }
    }

    // Extract description
    if let Some(contents) = data.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|c| c.as_array()) {
        for section in contents {
            if let Some(desc_shelf) = section.get("musicDescriptionShelfRenderer") {
                if let Some(runs) = desc_shelf.pointer("/description/runs").and_then(|r| r.as_array()) {
                    let mut desc = String::new();
                    for run in runs {
                        if let Some(text) = run.get("text").and_then(|t| t.as_str()) {
                            desc.push_str(text);
                        }
                    }
                    description = desc;
                }
            }
        }
    }

    // Now extract tracks/songs
    let mut songs = Vec::new();
    if let Some(contents) = data.pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents").and_then(|c| c.as_array()) {
        for section in contents {
            if let Some(shelf) = section.get("musicShelfRenderer") {
                if let Some(items) = shelf.get("contents").and_then(|i| i.as_array()) {
                    for item in items {
                        if let Some(item_renderer) = item.get("musicResponsiveListItemRenderer") {
                            if let Some(track) = extract_track_from_renderer(item_renderer) {
                                songs.push(track);
                            }
                        }
                    }
                }
            } else if let Some(carousel) = section.get("musicCarouselShelfRenderer") {
                if let Some(items) = carousel.get("contents").and_then(|i| i.as_array()) {
                    for item in items {
                        let renderer = item.get("musicResponsiveListItemRenderer")
                            .or_else(|| item.get("musicTwoRowItemRenderer"));
                        if let Some(item_renderer) = renderer {
                            if let Some(track) = extract_track_from_renderer(item_renderer) {
                                songs.push(track);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(serde_json::json!({
        "name": name,
        "thumbnail": thumbnail,
        "description": description,
        "subscribers": subscribers,
        "songs": songs
    }))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_yt_home,
            search_yt_direct,
            get_yt_stream_direct,
            get_yt_artist
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
