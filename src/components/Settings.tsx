import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Cookie, Palette, Sparkles, X } from "lucide-react";
import { YtPlaylist } from "../types";
import { AccountTab } from "./settings/AccountTab";
import { AppearanceTab } from "./settings/AppearanceTab";

const STORAGE_KEY = "aria_yt_cookie";
const PLAYLISTS_KEY = "aria_yt_playlists";

interface SettingsProps {
  onPlaylistsSync: (playlists: YtPlaylist[]) => void;
  wallpaperUrl: string;
  setWallpaperUrl: (url: string) => void;
  wallpaperOpacity: number;
  setWallpaperOpacity: (opacity: number) => void;
  hasUpdate?: boolean;
  latestVersion?: string;
  releaseBody?: string;
}

type Tab = "account" | "appearance";

const PRESETS = [
  { url: "", preview: null },
  {
    url: "https://w.wallhaven.cc/full/7j/wallhaven-7jew29.png",
    preview: "from-indigo-950 via-purple-950 to-black",
  },
  {
    url: "https://w.wallhaven.cc/full/6l/wallhaven-6lpkl7.jpg",
    preview: "from-blue-950 via-indigo-950 to-black",
  },
  {
    url: "https://w.wallhaven.cc/full/5y/wallhaven-5ymyz7.jpg",
    preview: "from-blue-950 via-indigo-950 to-black",
  },
  {
    url: "https://w.wallhaven.cc/full/ml/wallhaven-mlgzzy.png",
    preview: "from-blue-950 via-indigo-950 to-black",
  },
  {
    url: "https://w.wallhaven.cc/full/yq/wallhaven-yq2jz7.png",
    preview: "from-blue-950 via-indigo-950 to-black",
  },
];

export const Settings: React.FC<SettingsProps> = ({
  onPlaylistsSync,
  wallpaperUrl,
  setWallpaperUrl,
  wallpaperOpacity,
  setWallpaperOpacity,
  hasUpdate = false,
  latestVersion = "",
  releaseBody = "",
}) => {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [cookie, setCookie] = useState("");
  const [savedCookie, setSavedCookie] = useState("");
  const [showCookie, setShowCookie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState(wallpaperUrl);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setCookie(stored);
    setSavedCookie(stored);
    if (stored)
      invoke("set_auth_token", { cookie: stored }).catch(console.error);
    const cached = localStorage.getItem(PLAYLISTS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as YtPlaylist[];
        setSyncCount(parsed.length);
      } catch {
        /* ignore */
      }
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
    {
      id: "appearance",
      label: "Appearance",
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="shrink-0 px-8 pt-8 pb-6 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Manage your account, appearance, and preferences.
            </p>
          </div>
          {hasUpdate && (
            <button
              onClick={() => setShowReleaseNotes(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>v{latestVersion.replace(/^[^\d]+/, "")} available</span>
            </button>
          )}
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
          {activeTab === "account" ? (
            <AccountTab
              isAuthenticated={isAuthenticated}
              cookie={cookie}
              setCookie={setCookie}
              showCookie={showCookie}
              setShowCookie={setShowCookie}
              saving={saving}
              isDirty={isDirty}
              handleSave={handleSave}
              savedCookie={savedCookie}
              handleClear={handleClear}
              saveStatus={saveStatus}
              syncCount={syncCount}
              syncing={syncing}
              syncPlaylists={syncPlaylists}
            />
          ) : (
            <AppearanceTab
              customUrl={customUrl}
              setCustomUrl={setCustomUrl}
              wallpaperUrl={wallpaperUrl}
              applyWallpaper={applyWallpaper}
              wallpaperOpacity={wallpaperOpacity}
              setWallpaperOpacity={setWallpaperOpacity}
              presets={PRESETS}
            />
          )}
        </div>
      </div>

      {/* Release Notes Modal */}
      {showReleaseNotes && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowReleaseNotes(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-2xl bg-[#12151b] border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  v{latestVersion.replace(/^[^\d]+/, "")} Available
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  A new version of Aria is ready to download.
                </p>
              </div>
              <button
                onClick={() => setShowReleaseNotes(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {releaseBody && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="space-y-1.5 text-sm text-slate-300">
                    {releaseBody
                      .split("\n")
                      .filter(Boolean)
                      .map((line, i) => {
                        const trimmed = line.trim();
                        if (/^#{1,3}\s/.test(trimmed)) {
                          return (
                            <p
                              key={i}
                              className="text-xs font-semibold text-slate-200 pt-2"
                            >
                              {trimmed.replace(/^#+\s*/, "")}
                            </p>
                          );
                        }
                        if (/^-\s/.test(trimmed)) {
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-green-400 mt-0.5 shrink-0">
                                ✦
                              </span>
                              <span>{trimmed.replace(/^-\s*/, "")}</span>
                            </div>
                          );
                        }
                        if (/^\d+\.\s/.test(trimmed)) {
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-green-400 mt-0.5 shrink-0">
                                {trimmed.match(/^\d+/)?.[0]}.
                              </span>
                              <span>{trimmed.replace(/^\d+\.\s*/, "")}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={i} className="text-slate-300">
                            {trimmed}
                          </p>
                        );
                      })}
                  </div>
                </div>
              )}
              <button
                onClick={() =>
                  openUrl("https://github.com/R4V3NSH4D0W/Aria/releases/latest")
                }
                className="block w-full text-center py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/30 transition-colors cursor-pointer"
              >
                View on GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
