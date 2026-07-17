import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Settings as SettingsIcon,
  Cookie,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Info,
  RefreshCw,
  ListMusic,
} from "lucide-react";
import { YtPlaylist } from "../types";

const STORAGE_KEY = "aria_yt_cookie";
const PLAYLISTS_KEY = "aria_yt_playlists";

interface SettingsProps {
  onPlaylistsSync: (playlists: YtPlaylist[]) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onPlaylistsSync }) => {
  const [cookie, setCookie] = useState("");
  const [savedCookie, setSavedCookie] = useState("");
  const [showCookie, setShowCookie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncing, setSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  // On mount: restore from localStorage, then push into Rust
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setCookie(stored);
    setSavedCookie(stored);
    if (stored) {
      invoke("set_auth_token", { cookie: stored }).catch(console.error);
    }
    // Restore cached playlist count
    const cached = localStorage.getItem(PLAYLISTS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as YtPlaylist[];
        setSyncCount(parsed.length);
      } catch { /* ignore */ }
    }
  }, []);

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
      // Auto-sync playlists after saving token
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

  const isAuthenticated = savedCookie.length > 0;
  const isDirty = cookie.trim() !== savedCookie;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-slate-500/20 p-3 text-slate-300">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-slate-400">Configure Aria and connect your account.</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
          isAuthenticated
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
        }`}>
          {isAuthenticated ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-semibold ${isAuthenticated ? "text-emerald-300" : "text-amber-300"}`}>
              {isAuthenticated ? "Authenticated — personalised results active" : "Not authenticated — using anonymous session"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAuthenticated
                ? "Your YouTube Music cookie is active."
                : "Login is optional. Quick Picks will show popular tracks without it."}
            </p>
          </div>
        </div>

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/20 p-2.5 text-indigo-300">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">YouTube Music Cookie</h2>
              <p className="text-xs text-slate-400">Paste your full browser cookie string to enable authenticated requests.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0e1015] p-5 space-y-4">
            <div className="relative">
              <textarea
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                rows={5}
                placeholder={"Paste your YouTube Music cookie here...\nExample: VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; __Secure-3PSID=xxxx; ..."}
                className="w-full bg-[#080a0d] border border-white/5 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors leading-relaxed"
                style={{ filter: !showCookie && cookie.length > 0 ? "blur(4px)" : "none" }}
              />
              {cookie.length > 0 && (
                <button
                  onClick={() => setShowCookie((v) => !v)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
                >
                  {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Cookie"}
              </button>
              {savedCookie && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-300 border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
              {saveStatus === "success" && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <XCircle className="w-4 h-4" /> Failed to save
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Playlist Sync Section */}
        {isAuthenticated && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/20 p-2.5 text-violet-300">
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">YouTube Playlists</h2>
                <p className="text-xs text-slate-400">Sync your YouTube Music playlists to the sidebar.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0e1015] p-5 flex items-center justify-between gap-4">
              <div>
                {syncCount !== null ? (
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-white">{syncCount}</span>{" "}
                    {syncCount === 1 ? "playlist" : "playlists"} synced
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No playlists synced yet.</p>
                )}
                <p className="text-xs text-slate-600 mt-0.5">Appears in the sidebar under "YouTube Playlists".</p>
              </div>
              <button
                onClick={syncPlaylists}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Playlists"}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">How to get your cookie</h3>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0e1015] p-5 space-y-4 text-sm text-slate-300 leading-relaxed">
            <ol className="space-y-3 list-none">
              {[
                { n: "1", text: "Open music.youtube.com in your browser and sign in to your Google account." },
                { n: "2", text: "Open DevTools (F12 or right-click → Inspect), then go to the Network tab." },
                { n: "3", text: "Play any song. A request to youtubei/v1/player will appear in the Network tab." },
                { n: "4", text: "Click that request → Headers → scroll to Request Headers → find Cookie." },
                { n: "5", text: "Copy the entire cookie value (long string) and paste it above." },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <span className="text-slate-400">{text}</span>
                </li>
              ))}
            </ol>

            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Your cookie is stored in-memory only and cleared when you restart the app. It is only sent to YouTube Music's API endpoints.
              </p>
            </div>

            <a
              href="https://music.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open YouTube Music
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
