import React from "react";
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
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";

interface AccountTabProps {
  isAuthenticated: boolean;
  cookie: string;
  setCookie: (val: string) => void;
  showCookie: boolean;
  setShowCookie: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  isDirty: boolean;
  handleSave: () => Promise<void>;
  savedCookie: string;
  handleClear: () => Promise<void>;
  saveStatus: "idle" | "success" | "error";
  syncCount: number | null;
  syncing: boolean;
  syncPlaylists: () => Promise<void>;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  isAuthenticated,
  cookie,
  setCookie,
  showCookie,
  setShowCookie,
  saving,
  isDirty,
  handleSave,
  savedCookie,
  handleClear,
  saveStatus,
  syncCount,
  syncing,
  syncPlaylists,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Left column */}
      <div className="space-y-5">
        {/* Auth Status Banner */}
        <div
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
            isAuthenticated
              ? "bg-emerald-500/[0.06] border-emerald-500/20"
              : "bg-amber-500/[0.06] border-amber-500/20"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isAuthenticated ? "bg-emerald-500/20" : "bg-amber-500/20"
            }`}
          >
            {isAuthenticated ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${
                isAuthenticated ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {isAuthenticated
                ? "Connected — personalized results active"
                : "Not connected — anonymous session"}
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
              <h2 className="text-sm font-semibold text-white">
                YouTube Music Cookie
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste your full browser cookie to enable authenticated access.
              </p>
            </div>
          </div>

          {/* Cookie Input */}
          <div className="p-5 space-y-4">
            <div className="relative">
              <textarea
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                rows={4}
                placeholder={
                  "VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; __Secure-3PSID=xxxx; SAPISID=xxxx; ..."
                }
                className="w-full bg-black/30 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder-slate-700 resize-none focus:outline-none transition-colors leading-relaxed"
                style={{
                  filter:
                    !showCookie && cookie.length > 0 ? "blur(3px)" : "none",
                }}
              />
              {cookie.length > 0 && (
                <button
                  onClick={() => setShowCookie((v) => !v)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
                >
                  {showCookie ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
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
                <h2 className="text-sm font-semibold text-white">
                  YouTube Playlists
                </h2>
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
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync"}
              </button>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs text-slate-600">
                Synced playlists appear in the sidebar under YouTube Playlists.
              </p>
            </div>
          </div>
        )}

        {/* How-To Guide */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-slate-500/15 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-white font-medium">
              How to get your cookie
            </h3>
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
              <p className="text-xs text-slate-600">
                Cookie stored securely in app data.
              </p>
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
  );
};
