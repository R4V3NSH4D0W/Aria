use serde_json::Value;
use std::sync::Mutex;
use sha1::{Sha1, Digest};

// Global storage for YouTube visitor/session token
static VISITOR_DATA: Mutex<String> = Mutex::new(String::new());
// Global storage for user-provided auth cookie
static AUTH_COOKIE: Mutex<String> = Mutex::new(String::new());

#[tauri::command]
fn set_auth_token(cookie: String) -> Result<(), String> {
    println!("set_auth_token: storing {} chars of cookie", cookie.len());
    if let Ok(mut guard) = AUTH_COOKIE.lock() {
        *guard = cookie;
        Ok(())
    } else {
        Err("Failed to acquire AUTH_COOKIE lock".to_string())
    }
}

#[tauri::command]
fn get_auth_token() -> String {
    if let Ok(guard) = AUTH_COOKIE.lock() {
        guard.clone()
    } else {
        "".to_string()
    }
}

fn get_cookie_header() -> Option<String> {
    if let Ok(guard) = AUTH_COOKIE.lock() {
        if !guard.is_empty() {
            return Some(guard.clone());
        }
    }
    None
}

/// Extract SAPISID value from cookie string
fn extract_sapisid(cookie: &str) -> Option<String> {
    // Prefer __Secure-3PAPISID, then SAPISID
    for key in &["__Secure-3PAPISID", "SAPISID"] {
        for part in cookie.split(';') {
            let part = part.trim();
            if let Some(rest) = part.strip_prefix(key) {
                if let Some(val) = rest.strip_prefix('=') {
                    let v = val.trim().to_string();
                    if !v.is_empty() {
                        return Some(v);
                    }
                }
            }
        }
    }
    None
}

/// Compute SAPISIDHASH authorization header value.
/// YouTube Music requires this for all authenticated InnerTube requests.
/// Format: SAPISIDHASH <timestamp>_<SHA1("<timestamp> <sapisid> https://music.youtube.com")>
fn build_sapisid_hash(cookie: &str) -> Option<String> {
    let sapisid = extract_sapisid(cookie)?;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let input = format!("{} {} https://music.youtube.com", ts, sapisid);
    let mut hasher = Sha1::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    let hex = result.iter().map(|b| format!("{:02x}", b)).collect::<String>();
    Some(format!("SAPISIDHASH {}_{}", ts, hex))
}

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

    // Mirror Metrolist: if shuffleEndpoint (shufflePlaylistId) is None, return None.
    // This filters out artists with 0 tracks (or profiles without music).
    let shuffle_id = shuffle_playlist_id?;

    Some(serde_json::json!({
        "type": "artist",
        "browseId": browse_id,
        "title": title,
        "thumbnail": thumbnail,
        "shufflePlaylistId": shuffle_id
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

    let mut req = client.post("https://music.youtube.com/youtubei/v1/browse")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json");
    if let Some(cookie) = get_cookie_header() {
        req = req.header("Cookie", cookie);
    }
    let res = req.send()
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

    let mut req = client.post("https://music.youtube.com/youtubei/v1/search")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json");
    if let Some(cookie) = get_cookie_header() {
        req = req.header("Cookie", cookie);
    }
    let res = req.send()
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
    // Mimics Metrolist's preferred VISIONOS client to prevent bot-detection issues
    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "VISIONOS",
                "clientVersion": "0.1",
                "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "osName": "visionOS",
                "osVersion": "1.3.21O771",
                "deviceMake": "Apple",
                "deviceModel": "RealityDevice14,1",
                "hl": "en",
                "gl": "US",
                "visitorData": visitor_data
            }
        },
        "videoId": video_id
    });

    let res = client.post("https://www.youtube.com/youtubei/v1/player")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")
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
async fn get_yt_explore() -> Result<Vec<Value>, String> {
    println!("get_yt_explore: fetching new releases / community playlists");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
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
        "browseId": "FEmusic_new_releases"
    });

    let mut req = client
        .post("https://music.youtube.com/youtubei/v1/browse")
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json");
    if let Some(cookie) = get_cookie_header() {
        req = req.header("Cookie", cookie);
    }

    let res = req.send().await.map_err(|e| format!("Explore request failed: {}", e))?;
    let data = res.json::<Value>().await.map_err(|e| format!("Failed to parse explore response: {}", e))?;

    let mut playlists: Vec<Value> = Vec::new();

    // Walk all sectionListRenderer contents sections
    let sections = data
        .pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
        .or_else(|| data.pointer("/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents"))
        .and_then(|v| v.as_array());

    if let Some(sections) = sections {
        for section in sections {
            // Try gridRenderer items
            let items = section
                .pointer("/gridRenderer/items")
                .or_else(|| section.pointer("/musicCarouselShelfRenderer/contents"))
                .or_else(|| section.pointer("/musicShelfRenderer/contents"))
                .and_then(|v| v.as_array());

            if let Some(items) = items {
                for item in items {
                    let renderer = item.get("musicTwoRowItemRenderer")
                        .or_else(|| item.get("gridRenderer"));

                    if let Some(renderer) = renderer {
                        let title = renderer
                            .pointer("/title/runs/0/text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let browse_id = renderer
                            .pointer("/navigationEndpoint/browseEndpoint/browseId")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let thumbnail = renderer
                            .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
                            .and_then(|v| v.as_array())
                            .and_then(|arr| arr.last())
                            .and_then(|t| t.get("url"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let subtitle = renderer
                            .pointer("/subtitle/runs/0/text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        if !title.is_empty() && !browse_id.is_empty() {
                            playlists.push(serde_json::json!({
                                "id": browse_id,
                                "title": title,
                                "thumbnail": thumbnail,
                                "subtitle": subtitle
                            }));
                        }
                    }
                }
            }
        }
    }

    // Cap at 20 items
    playlists.truncate(20);
    println!("get_yt_explore: found {} items", playlists.len());
    Ok(playlists)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_yt_user_playlists() -> Result<Vec<Value>, String> {
    println!("get_yt_user_playlists: fetching user playlists");

    let cookie = match get_cookie_header() {
        Some(c) => c,
        None => return Err("No auth cookie set. Please add your cookie in Settings.".to_string()),
    };

    // Build SAPISIDHASH — required for authenticated YTM InnerTube requests
    let sapisid_hash = build_sapisid_hash(&cookie);
    println!("get_yt_user_playlists: sapisid_hash present = {}", sapisid_hash.is_some());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // Helper closure to make an authenticated YTM browse request
    let make_request = |browse_id: &str| {
        let payload = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20260114.03.00",
                    "hl": "en",
                    "gl": "US",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0,gzip(gfe)"
                }
            },
            "browseId": browse_id
        });
        payload
    };

    let mut all_playlists: Vec<Value> = Vec::new();

    // Try both browse endpoints — liked_playlists is primary, library_landing is fallback
    for browse_id in &["FEmusic_liked_playlists", "FEmusic_library_landing"] {
        let payload = make_request(browse_id);

        let mut req = client
            .post("https://music.youtube.com/youtubei/v1/browse")
            .query(&[("key", "AIzaSyC9XL3ZjWddXya6X74dJoCTL-NKNELL6OA")])
            .json(&payload)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
            .header("Content-Type", "application/json")
            .header("Cookie", &cookie)
            .header("X-Goog-AuthUser", "0")
            .header("X-Origin", "https://music.youtube.com")
            .header("Origin", "https://music.youtube.com")
            .header("Referer", "https://music.youtube.com/")
            .header("x-youtube-client-name", "67")
            .header("x-youtube-client-version", "1.20260114.03.00");

        if let Some(ref hash) = sapisid_hash {
            req = req.header("Authorization", hash);
        }

        let res = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                println!("get_yt_user_playlists: request failed for {}: {}", browse_id, e);
                continue;
            }
        };

        let status = res.status();
        println!("get_yt_user_playlists: HTTP {} for browse {}", status, browse_id);

        let data: Value = match res.json().await {
            Ok(d) => d,
            Err(e) => {
                println!("get_yt_user_playlists: JSON parse error: {}", e);
                continue;
            }
        };

        // Print top-level and contents keys for diagnostics
        println!("get_yt_user_playlists: top keys = {:?}",
            data.as_object().map(|m| m.keys().collect::<Vec<_>>()));
        if let Some(c) = data.get("contents") {
            println!("get_yt_user_playlists: contents keys = {:?}",
                c.as_object().map(|m| m.keys().collect::<Vec<_>>()));
        }

        // Exhaustive set of known InnerTube path prefixes for playlist grids/shelves
        let candidate_paths: &[&str] = &[
            // singleColumn paths
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/gridRenderer/items",
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicShelfRenderer/contents",
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicPlaylistShelfRenderer/contents",
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicCarouselShelfRenderer/contents",
            // Try second section index too
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/1/gridRenderer/items",
            "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/1/musicShelfRenderer/contents",
            // twoColumn paths
            "/contents/twoColumnBrowseResultsRenderer/primaryContents/sectionListRenderer/contents/0/gridRenderer/items",
            "/contents/twoColumnBrowseResultsRenderer/primaryContents/sectionListRenderer/contents/0/musicShelfRenderer/contents",
            "/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents/0/gridRenderer/items",
        ];

        let mut found_items = false;
        for path in candidate_paths {
            if let Some(items) = data.pointer(path).and_then(|v| v.as_array()) {
                println!("get_yt_user_playlists: found {} items at path: {}", items.len(), path);
                found_items = true;
                for item in items {
                    if let Some(pl) = parse_playlist_item(item) {
                        if !all_playlists.iter().any(|p| p["id"] == pl["id"]) {
                            all_playlists.push(pl);
                        }
                    }
                }
                break;
            }
        }

        if !found_items {
            // Print the first 1000 chars of the raw response for debugging
            let raw = serde_json::to_string(&data).unwrap_or_default();
            println!("get_yt_user_playlists: no items found. Raw snippet: {}", &raw[..raw.len().min(2000)]);
        }

        if !all_playlists.is_empty() {
            break; // Stop if first endpoint succeeded
        }
    }

    println!("get_yt_user_playlists: found {} playlists total", all_playlists.len());
    Ok(all_playlists)
}

/// Parse a single playlist item from either musicTwoRowItemRenderer or musicResponsiveListItemRenderer
fn parse_playlist_item(item: &Value) -> Option<Value> {
    // musicTwoRowItemRenderer (grid card — most common for playlists)
    if let Some(renderer) = item.get("musicTwoRowItemRenderer") {
        let title = renderer
            .pointer("/title/runs/0/text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let browse_id = renderer
            .pointer("/navigationEndpoint/browseEndpoint/browseId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let thumbnail = renderer
            .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let subtitle = renderer
            .pointer("/subtitle/runs/0/text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !browse_id.is_empty() && !title.is_empty() && browse_id != "VLLM" {
            return Some(serde_json::json!({
                "id": browse_id,
                "title": title,
                "thumbnail": thumbnail,
                "subtitle": subtitle
            }));
        }
    }
    // musicResponsiveListItemRenderer (list view)
    if let Some(renderer) = item.get("musicResponsiveListItemRenderer") {
        let title = renderer
            .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let browse_id = renderer
            .pointer("/navigationEndpoint/browseEndpoint/browseId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let thumbnail = renderer
            .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !browse_id.is_empty() && !title.is_empty() {
            return Some(serde_json::json!({
                "id": browse_id,
                "title": title,
                "thumbnail": thumbnail,
                "subtitle": ""
            }));
        }
    }
    None
}

#[tauri::command]
async fn get_yt_playlist_tracks(browse_id: String) -> Result<Vec<Value>, String> {
    println!("get_yt_playlist_tracks: browse_id = {}", browse_id);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // Ensure browseId starts with VL (YTM playlist convention)
    let effective_id = if browse_id.starts_with("VL") {
        browse_id.clone()
    } else {
        format!("VL{}", browse_id)
    };

    let payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US",
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0,gzip(gfe)"
            }
        },
        "browseId": effective_id
    });

    let mut req = client
        .post("https://music.youtube.com/youtubei/v1/browse")
        .query(&[("key", "AIzaSyC9XL3ZjWddXya6X74dJoCTL-NKNELL6OA")])
        .json(&payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json")
        .header("X-Goog-AuthUser", "0")
        .header("X-Origin", "https://music.youtube.com")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("x-youtube-client-name", "67")
        .header("x-youtube-client-version", "1.20260114.03.00");

    // Add cookie + SAPISIDHASH if authenticated
    if let Some(cookie) = get_cookie_header() {
        let hash = build_sapisid_hash(&cookie);
        println!("get_yt_playlist_tracks: cookie len={}, sapisid_hash present={}", cookie.len(), hash.is_some());
        if let Some(h) = hash {
            req = req.header("Authorization", h);
        }
        req = req.header("Cookie", cookie);
    } else {
        println!("get_yt_playlist_tracks: NO cookie found in AUTH_COOKIE store");
    }

    let res = req.send().await
        .map_err(|e| format!("Playlist browse request failed: {}", e))?;

    let status = res.status();
    println!("get_yt_playlist_tracks: HTTP {}", status);

    let data: Value = res.json().await
        .map_err(|e| format!("Failed to parse playlist response: {}", e))?;

    let mut tracks: Vec<Value> = Vec::new();

    // YTM playlist tracks live in musicShelfRenderer or musicPlaylistShelfRenderer
    // Primary path: singleColumnBrowseResultsRenderer → musicShelfRenderer
    let shelf_paths: &[&str] = &[
        "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicShelfRenderer/contents",
        "/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents/0/musicPlaylistShelfRenderer/contents",
        "/contents/twoColumnBrowseResultsRenderer/secondaryContents/musicShelfRenderer/contents",
        "/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents/0/musicShelfRenderer/contents",
        "/contents/twoColumnBrowseResultsRenderer/secondaryContents/sectionListRenderer/contents/0/musicPlaylistShelfRenderer/contents",
    ];

    for path in shelf_paths {
        if let Some(items) = data.pointer(path).and_then(|v| v.as_array()) {
            println!("get_yt_playlist_tracks: found {} items at {}", items.len(), path);
            for item in items {
                let renderer = item.get("musicResponsiveListItemRenderer")
                    .or_else(|| item.get("musicTwoRowItemRenderer"));
                if let Some(r) = renderer {
                    if let Some(track) = extract_track_from_renderer(r) {
                        tracks.push(track);
                    }
                }
            }
            if !tracks.is_empty() {
                break;
            }
        }
    }

    if tracks.is_empty() {
        let raw = serde_json::to_string(&data).unwrap_or_default();
        println!("get_yt_playlist_tracks: no tracks found. top keys = {:?}",
            data.as_object().map(|m| m.keys().collect::<Vec<_>>()));
        println!("get_yt_playlist_tracks: raw snippet: {}", &raw[..raw.len().min(1500)]);
    }

    println!("get_yt_playlist_tracks: returning {} tracks", tracks.len());
    Ok(tracks)
}

#[tauri::command]
async fn get_yt_lyrics(
    video_id: String,
    title: String,
    artist: String,
    duration: u64,
) -> Result<Option<String>, String> {
    println!("get_yt_lyrics: video_id={}, title={}, artist={}, duration={}", video_id, title, artist, duration);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Try LRCLIB API first
    let query_params = [
        ("artist_name", &artist),
        ("track_name", &title),
        ("duration", &duration.to_string()),
    ];
    println!("get_yt_lyrics: querying LRCLIB with {:?}", query_params);

    if let Ok(res) = client.get("https://lrclib.net/api/get")
        .query(&query_params)
        .header("User-Agent", "Aria Music Player v1.0.7 (https://github.com/R4V3NSH4D0W/Aria)")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(data) = res.json::<serde_json::Value>().await {
                // If it is marked as instrumental
                if let Some(true) = data.get("instrumental").and_then(|v| v.as_bool()) {
                    return Ok(Some("♪ Instrumental ♪".to_string()));
                }
                // Try syncedLyrics first (to allow time-synced scrolling in frontend)
                if let Some(synced) = data.get("syncedLyrics").and_then(|v| v.as_str()) {
                    if !synced.trim().is_empty() {
                        println!("get_yt_lyrics: found synced lyrics from LRCLIB");
                        return Ok(Some(synced.to_string()));
                    }
                }
                // Try plainLyrics
                if let Some(plain) = data.get("plainLyrics").and_then(|v| v.as_str()) {
                    if !plain.trim().is_empty() {
                        println!("get_yt_lyrics: successfully loaded plain lyrics from LRCLIB");
                        return Ok(Some(plain.to_string()));
                    }
                }
            }
        } else {
            println!("get_yt_lyrics: LRCLIB returned HTTP status {}", res.status());
        }
    }

    // 2. Fallback to YouTube Music API
    println!("get_yt_lyrics: falling back to YouTube Music API");
    let next_payload = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260114.03.00",
                "hl": "en",
                "gl": "US"
            }
        },
        "videoId": video_id
    });

    let mut next_req = client.post("https://music.youtube.com/youtubei/v1/next")
        .json(&next_payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json");

    if let Some(cookie) = get_cookie_header() {
        next_req = next_req.header("Cookie", cookie);
    }

    let next_res = next_req.send().await
        .map_err(|e| format!("Next request failed: {}", e))?;

    let next_data: Value = next_res.json().await
        .map_err(|e| format!("Failed to parse next response: {}", e))?;

    let tabs = next_data.pointer("/contents/singleColumnMusicResultsRenderer/pivotTabRenderer/tabs");
    let mut lyrics_browse_id = None;

    if let Some(tabs_array) = tabs.and_then(|t| t.as_array()) {
        for tab in tabs_array {
            if let Some(title) = tab.pointer("/tabRenderer/title/runs/0/text").and_then(|t| t.as_str()) {
                if title == "Lyrics" {
                    lyrics_browse_id = tab.pointer("/tabRenderer/endpoint/browseEndpoint/browseId")
                        .and_then(|id| id.as_str())
                        .map(|s| s.to_string());
                    break;
                }
            }
        }
    }

    let browse_id = match lyrics_browse_id {
        Some(id) => id,
        None => {
            println!("get_yt_lyrics: no lyrics browseId found in /next response");
            return Ok(None);
        }
    };

    let browse_payload = serde_json::json!({
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

    let mut browse_req = client.post("https://music.youtube.com/youtubei/v1/browse")
        .json(&browse_payload)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0")
        .header("Content-Type", "application/json");

    if let Some(cookie) = get_cookie_header() {
        browse_req = browse_req.header("Cookie", cookie);
    }

    let browse_res = browse_req.send().await
        .map_err(|e| format!("Browse lyrics request failed: {}", e))?;

    let browse_data: Value = browse_res.json().await
        .map_err(|e| format!("Failed to parse browse lyrics response: {}", e))?;

    let lyrics_text = browse_data.pointer("/sectionListRenderer/contents/0/musicDescriptionShelfRenderer/description/runs/0/text")
        .or_else(|| browse_data.pointer("/contents/sectionListRenderer/contents/0/musicDescriptionShelfRenderer/description/runs/0/text"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string());

    Ok(lyrics_text)
}

use std::fs::{self, File};
use std::io::Write;
use tauri::Manager;

#[tauri::command]
async fn download_track(
    app_handle: tauri::AppHandle,
    video_id: String,
    stream_url: String,
) -> Result<String, String> {
    let mut local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get local data dir: {}", e))?;
    
    local_data_dir.push("downloads");
    fs::create_dir_all(&local_data_dir)
        .map_err(|e| format!("Failed to create downloads directory: {}", e))?;
    
    let file_name = format!("{}.mp3", video_id);
    local_data_dir.push(&file_name);
    
    let client = reqwest::Client::new();
    
    // 1. Get total file length using a 0-0 range request
    let mut req_len = client
        .get(&stream_url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")
        .header("Range", "bytes=0-0");
        
    if let Some(cookie) = get_cookie_header() {
        req_len = req_len.header("Cookie", cookie);
    }
    
    let res_len = req_len.send().await.map_err(|e| format!("Length check failed: {}", e))?;
    
    let total_size = if let Some(content_range) = res_len.headers().get("Content-Range") {
        let range_str = content_range.to_str().unwrap_or("");
        if let Some(pos) = range_str.rfind('/') {
            range_str[pos + 1..].parse::<u64>().unwrap_or(0)
        } else {
            0
        }
    } else {
        res_len.content_length().unwrap_or(0)
    };

    let mut file = File::create(&local_data_dir)
        .map_err(|e| format!("Failed to create destination file: {}", e))?;

    if total_size == 0 {
        // Fallback: download whole file in a single request if length is undetermined
        let mut req_fallback = client
            .get(&stream_url)
            .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15");
        if let Some(cookie) = get_cookie_header() {
            req_fallback = req_fallback.header("Cookie", cookie);
        }
        let res_fallback = req_fallback.send().await.map_err(|e| e.to_string())?;
        let bytes = res_fallback.bytes().await.map_err(|e| e.to_string())?;
        file.write_all(&bytes).map_err(|e| e.to_string())?;
    } else {
        // Download in 1MB chunks to bypass YouTube playback speed throttling
        let chunk_size = 1_048_576; // 1MB
        let mut start = 0;
        
        while start < total_size {
            let end = std::cmp::min(start + chunk_size - 1, total_size - 1);
            let mut req_chunk = client
                .get(&stream_url)
                .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")
                .header("Range", format!("bytes={}-{}", start, end));
                
            if let Some(cookie) = get_cookie_header() {
                req_chunk = req_chunk.header("Cookie", cookie);
            }
            
            let res_chunk = req_chunk.send().await.map_err(|e| format!("Chunk request failed: {}", e))?;
            if !res_chunk.status().is_success() && res_chunk.status() != reqwest::StatusCode::PARTIAL_CONTENT {
                return Err(format!("Chunk returned status {}", res_chunk.status()));
            }
            
            let bytes = res_chunk.bytes().await.map_err(|e| format!("Failed to read chunk bytes: {}", e))?;
            file.write_all(&bytes).map_err(|e| format!("Failed to write chunk to disk: {}", e))?;
            
            start += chunk_size;
        }
    }
        
    Ok(local_data_dir.to_string_lossy().into_owned())
}

#[tauri::command]
fn check_download_exists(
    app_handle: tauri::AppHandle,
    video_id: String,
) -> Result<Option<String>, String> {
    let mut local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get local data dir: {}", e))?;
        
    local_data_dir.push("downloads");
    let file_name = format!("{}.mp3", video_id);
    local_data_dir.push(&file_name);
    
    if local_data_dir.exists() {
        Ok(Some(local_data_dir.to_string_lossy().into_owned()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn delete_downloaded_track(
    app_handle: tauri::AppHandle,
    video_id: String,
) -> Result<bool, String> {
    let mut local_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get local data dir: {}", e))?;
        
    local_data_dir.push("downloads");
    let file_name = format!("{}.mp3", video_id);
    local_data_dir.push(&file_name);
    
    if local_data_dir.exists() {
        fs::remove_file(&local_data_dir)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            set_auth_token,
            get_auth_token,
            get_yt_home,
            get_yt_explore,
            search_yt_direct,
            get_yt_stream_direct,
            get_yt_artist,
            get_yt_user_playlists,
            get_yt_playlist_tracks,
            get_yt_lyrics,
            download_track,
            check_download_exists,
            delete_downloaded_track
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
