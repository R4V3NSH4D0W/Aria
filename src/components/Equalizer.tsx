import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface EqualizerProps {
  eqGains: number[];
  setEqGains: (gains: number[]) => void;
  eqEnabled: boolean;
  setEqEnabled: (enabled: boolean) => void;
}

const PRESET_LABELS: Record<string, string> = {
  flat: "Flat",
  bass: "Bass Boost",
  vocal: "Vocal Boost",
  electronic: "Electronic",
  pop: "Pop",
  rock: "Rock",
  classical: "Classical",
  podcast: "Podcast",
  custom: "Custom",
};

export const Equalizer: React.FC<EqualizerProps> = ({
  eqGains,
  setEqGains,
  eqEnabled,
  setEqEnabled,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activePreset = (() => {
    const str = JSON.stringify(eqGains);
    if (str === JSON.stringify([0, 0, 0, 0, 0])) return "flat";
    if (str === JSON.stringify([6, 4, 0, 0, 0])) return "bass";
    if (str === JSON.stringify([-2, 0, 4, 4, 1])) return "vocal";
    if (str === JSON.stringify([4, 2, 0, 2, 4])) return "electronic";
    if (str === JSON.stringify([-1, 2, 3, 2, -1])) return "pop";
    if (str === JSON.stringify([4, 2, -2, 2, 4])) return "rock";
    if (str === JSON.stringify([3, 2, 0, 2, 3])) return "classical";
    if (str === JSON.stringify([-3, 0, 4, 2, -1])) return "podcast";
    return "custom";
  })();

  const selectPreset = (val: string) => {
    if (val === "flat") setEqGains([0, 0, 0, 0, 0]);
    else if (val === "bass") setEqGains([6, 4, 0, 0, 0]);
    else if (val === "vocal") setEqGains([-2, 0, 4, 4, 1]);
    else if (val === "electronic") setEqGains([4, 2, 0, 2, 4]);
    else if (val === "pop") setEqGains([-1, 2, 3, 2, -1]);
    else if (val === "rock") setEqGains([4, 2, -2, 2, 4]);
    else if (val === "classical") setEqGains([3, 2, 0, 2, 3]);
    else if (val === "podcast") setEqGains([-3, 0, 4, 2, -1]);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Toggle Equalizer */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
        <div>
          <h4 className="text-sm font-semibold text-white">Audio Equalizer</h4>
          <p className="text-xs text-slate-400 mt-1">
            Shape your frequencies. Works in real-time on streaming and cached playback.
          </p>
        </div>
        <button
          onClick={() => setEqEnabled(!eqEnabled)}
          className={`w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer ${
            eqEnabled ? "bg-indigo-500" : "bg-white/10"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-all duration-300 transform ${
              eqEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Preset Selector Container */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between relative" ref={dropdownRef}>
          <h4 className="text-sm font-semibold text-white">Frequency Preset</h4>
          
          {/* Custom Transparent Dropdown Trigger */}
          <div className="relative">
            <button
              disabled={!eqEnabled}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 bg-white/[0.03] border border-white/10 hover:bg-white/5 disabled:hover:bg-white/[0.03] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-semibold py-1.5 px-3 rounded-xl cursor-pointer text-slate-300 hover:text-white`}
            >
              <span>{PRESET_LABELS[activePreset]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Custom Options Panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl py-2 shadow-2xl z-50 flex flex-col">
                {Object.keys(PRESET_LABELS).map((key) => (
                  <button
                    key={key}
                    disabled={key === "custom"}
                    onClick={() => selectPreset(key)}
                    className={`w-full px-4 py-1.5 text-left text-xs transition-all hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer ${
                      activePreset === key ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {PRESET_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5-Band Slider Grids */}
        <div className={`grid grid-cols-5 gap-4 pt-6 pb-2 select-none transition-opacity ${eqEnabled ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
          {[
            { label: "Bass", freq: "60 Hz", index: 0 },
            { label: "Low-Mid", freq: "230 Hz", index: 1 },
            { label: "Mid", freq: "910 Hz", index: 2 },
            { label: "Up-Mid", freq: "4 kHz", index: 3 },
            { label: "Treble", freq: "14 kHz", index: 4 },
          ].map((band) => (
            <div key={band.index} className="flex flex-col items-center gap-4">
              {/* Gain reading */}
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {eqGains[band.index] > 0 ? `+${eqGains[band.index]}` : eqGains[band.index]} dB
              </span>

              {/* Slider Track Wrapper */}
              <div className="h-44 w-12 flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqGains[band.index]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const next = [...eqGains];
                    next[band.index] = val;
                    setEqGains(next);
                  }}
                  style={{
                    background: `linear-gradient(to right, #6366f1 ${((eqGains[band.index] + 12) / 24) * 100}%, rgba(255,255,255,0.05) ${((eqGains[band.index] + 12) / 24) * 100}%)`
                  }}
                  className="absolute w-36 h-1 rounded-full appearance-none cursor-pointer outline-none -rotate-90 transition-all
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#818cf8] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                />
              </div>

              {/* Band Labels */}
              <div className="text-center">
                <p className="text-[10px] font-semibold text-slate-300">{band.label}</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{band.freq}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
