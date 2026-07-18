import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Cookie,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Save,
  RefreshCw,
  ListMusic,
  Palette,
  Image as ImageIcon,
  Layers,
  Wifi,
  WifiOff,
  ChevronRight,
  Info,
} from "lucide-react";
import { YtPlaylist } from "../types";

const STORAGE_KEY = "aria_yt_cookie";
const PLAYLISTS_KEY = "aria_yt_playlists";

interface SettingsProps {
  onPlaylistsSync: (playlists: YtPlaylist[]) => void;
  wallpaperUrl: string;
  setWallpaperUrl: (url: string) => void;
  wallpaperOpacity: number;
  setWallpaperOpacity: (opacity: number) => void;
}

type Tab = "account" | "appearance";

const PRESETS = [
  { name: "None", url: "", preview: null },
  {
    name: "Cozy Room",
    url: "https://w.wallhaven.cc/full/gw/wallhaven-gwmj9l.png",
    preview: "from-amber-950 via-neutral-900 to-black",
  },
  {
    name: "Cyber Street",
    url: "https://w.wallhaven.cc/full/7j/wallhaven-7jew29.png",
    preview: "from-indigo-950 via-purple-950 to-black",
  },
  {
    name: "Scenic Cliff",
    url: "https://w.wallhaven.cc/full/zp/wallhaven-zpdogo.jpg",
    preview: "from-slate-900 via-zinc-900 to-black",
  },
  {
    name: "Anime Sky",
    url: "https://w.wallhaven.cc/full/6l/wallhaven-6lpkl7.jpg",
    preview: "from-blue-950 via-indigo-950 to-black",
  },
];

export const Settings: React.FC<SettingsProps> = ({
  onPlaylistsSync,
  wallpaperUrl,
  setWallpaperUrl,
  wallpaperOpacity,
  setWallpaperOpacity,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [cookie, setCookie] = useState("");
  const [savedCookie, setSavedCookie] = useState("");
  const [showCookie, setShowCookie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState(wallpaperUrl);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setCookie(stored);
    setSavedCookie(stored);
    if (stored) invoke("set_auth_token", { cookie: stored }).catch(console.error);
    const cached = localStorage.getItem(PLAYLISTS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as YtPlaylist[];
        setSyncCount(parsed.length);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    setCustomUrl(wallpaperUrl);
  }, [wallpaperUrl]);

  const syncPlaylists = async () => {
    setSyncing(true);
    try {
      const playlists = await invoke<YtPlaylist[]>("get_yt_user_playlists");
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      setSyncCount(playlists.length);
      onPlaylistsSync(playlists);
    } catch (err) {
      console.error("Playlist sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const trimmed = cookie.trim();
      localStorage.setItem(STORAGE_KEY, trimmed);
      await invoke("set_auth_token", { cookie: trimmed });
      setSavedCookie(trimmed);
      setSaveStatus("success");
      if (trimmed) await syncPlaylists();
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleClear = async () => {
    setCookie("");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PLAYLISTS_KEY);
    try {
      await invoke("set_auth_token", { cookie: "" });
      setSavedCookie("");
      setSyncCount(null);
      onPlaylistsSync([]);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const applyWallpaper = (url: string) => {
    setWallpaperUrl(url);
    setCustomUrl(url);
    localStorage.setItem("aria_wallpaper_url", url);
  };

  const isAuthenticated = savedCookie.length > 0;
  const isDirty = cookie.trim() !== savedCookie;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "Account", icon: <Cookie className="w-4 h-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="shrink-0 px-8 pt-8 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Settings</h1>
          <p className="text-sm text-slate-500">Manage your account, appearance, and preferences.</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mt-6 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-7 pb-44 space-y-5">

          {/* ── ACCOUNT TAB ── */}
          {activeTab === "account" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left column */}
              <div className="space-y-5">
                {/* Auth Status Banner */}
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                isAuthenticated
                  ? "bg-emerald-500/[0.06] border-emerald-500/20"
                  : "bg-amber-500/[0.06] border-amber-500/20"
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isAuthenticated ? "bg-emerald-500/20" : "bg-amber-500/20"
                }`}>
                  {isAuthenticated
                    ? <Wifi className="w-4 h-4 text-emerald-400" />
                    : <WifiOff className="w-4 h-4 text-amber-400" />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isAuthenticated ? "text-emerald-300" : "text-amber-300"}`}>
                    {isAuthenticated ? "Connected — personalized results active" : "Not connected — anonymous session"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {isAuthenticated
                      ? "Your YouTube Music cookie is active and valid."
                      : "Login is optional. Quick Picks will show popular tracks."}
                  </p>
                </div>
                {isAuthenticated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />
                )}
              </div>

              {/* Cookie Card */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Cookie className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">YouTube Music Cookie</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Paste your full browser cookie to enable authenticated access.</p>
                  </div>
                </div>

                {/* Cookie Input */}
                <div className="p-5 space-y-4">
                  <div className="relative">
                    <textarea
                      value={cookie}
                      onChange={(e) => setCookie(e.target.value)}
                      rows={4}
                      placeholder={"VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; __Secure-3PSID=xxxx; SAPISID=xxxx; ..."}
                      className="w-full bg-black/30 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder-slate-700 resize-none focus:outline-none transition-colors leading-relaxed"
                      style={{ filter: !showCookie && cookie.length > 0 ? "blur(3px)" : "none" }}
                    />
                    {cookie.length > 0 && (
                      <button
                        onClick={() => setShowCookie((v) => !v)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
                      >
                        {showCookie ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? "Saving..." : "Save Cookie"}
                    </button>
                    {savedCookie && (
                      <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/15 hover:bg-red-500/8 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    )}
                    {saveStatus === "success" && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Playlist Sync Card */}
                {isAuthenticated && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                        <ListMusic className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-white">YouTube Playlists</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {syncCount !== null
                            ? `${syncCount} ${syncCount === 1 ? "playlist" : "playlists"} synced`
                            : "Not synced yet"}
                        </p>
                      </div>
                      <button
                        onClick={syncPlaylists}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-600/90 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync"}
                      </button>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-xs text-slate-600">Synced playlists appear in the sidebar under YouTube Playlists.</p>
                    </div>
                  </div>
                )}

                {/* How-To Guide */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/15 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">How to get your cookie</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      "Open music.youtube.com in your browser and sign in.",
                      "Open DevTools (F12), go to the Network tab.",
                      "Play any song — find the request to youtubei/v1/player.",
                      "Click the request → Headers → find the Cookie header.",
                      "Copy the full cookie string and paste it above.",
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-lg bg-indigo-500/15 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <p className="text-xs text-slate-600">Cookie stored in-memory only.</p>
                      <a
                        href="https://music.youtube.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-3"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open YT Music
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ── */}
          {activeTab === "appearance" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
              {/* Custom Wallpaper URL */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Custom URL</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Paste a direct image or animated GIF link.</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/my-wallpaper.jpg"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customUrl.trim()) {
                          applyWallpaper(customUrl.trim());
                        }
                      }}
                      className="min-w-0 flex-1 bg-black/30 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => applyWallpaper(customUrl.trim())}
                      disabled={!customUrl.trim() || customUrl.trim() === wallpaperUrl}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Apply
                    </button>
                  </div>
                  {wallpaperUrl && (
                    <button
                      onClick={() => applyWallpaper("")}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Remove current wallpaper
                    </button>
                  )}
                </div>
              </div>

              {/* Opacity + Preview Card */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Background Opacity</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Control how prominent your chosen wallpaper appears.</p>
                  </div>
                  <span className="ml-auto font-mono text-sm font-bold text-indigo-400 tabular-nums">
                    {Math.round(wallpaperOpacity * 100)}%
                  </span>
                </div>
                <div className="p-5">
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="0.95"
                      step="0.05"
                      value={wallpaperOpacity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setWallpaperOpacity(val);
                        localStorage.setItem("aria_wallpaper_opacity", val.toString());
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-white/10"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-slate-600">Subtle</span>
                      <span className="text-xs text-slate-600">Vivid</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Wallpapers */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Preset Backdrops</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Curated high-quality backgrounds for Aria.</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {PRESETS.map((preset) => {
                      const isActive = wallpaperUrl === preset.url;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => applyWallpaper(preset.url)}
                          className={`relative rounded-xl overflow-hidden h-20 border text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                            isActive
                              ? "border-indigo-500 ring-2 ring-indigo-500/30 scale-[1.02]"
                              : "border-white/5 hover:border-white/15 hover:scale-[1.01]"
                          }`}
                        >
                          {/* Background preview */}
                          {preset.url ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-105"
                              style={{ backgroundImage: `url(${preset.url})` }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[#0a0b0e]" />
                          )}
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                          {/* Label */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            {isActive ? (
                              <CheckCircle2 className="w-5 h-5 text-indigo-400 drop-shadow-lg" />
                            ) : (
                              !preset.url && (
                                <span className="relative z-10 text-[11px] font-semibold text-slate-300">
                                  {preset.name}
                                </span>
                              )
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Live Preview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Shows the current backdrop with cover fit.</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-white/5 bg-[#0a0b0e]">
                    {wallpaperUrl ? (
                      <img
                        src={wallpaperUrl}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-cover"
                        style={{ opacity: wallpaperOpacity }}
                      />
                    ) : (
                      <div className="h-full w-full bg-[#0a0b0e]" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
