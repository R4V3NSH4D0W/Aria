import React from "react";

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-8 space-y-12 overflow-y-auto">
      {/* Speed Dial Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-3 w-64 bg-white/5 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex-none w-48 animate-pulse"
            >
              <div className="w-full aspect-square bg-white/5 rounded-xl mb-3" />
              <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
              <div className="h-3 w-1/2 bg-white/5 rounded-lg mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Shelves Skeleton (e.g. Keep Listening & Discover) */}
      {[1, 2].map((i) => (
        <div key={i} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-3 w-56 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="flex-none w-48 space-y-3 animate-pulse">
                <div className="w-48 h-48 bg-white/5 rounded-xl" />
                <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
                <div className="h-3 w-1/2 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
