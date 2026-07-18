import React from "react";
import { ListMusic } from "lucide-react";

interface MoodsGenresProps {
  onExploreGenre: (genre: string) => void;
}

export const MoodsGenres: React.FC<MoodsGenresProps> = ({ onExploreGenre }) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-fuchsia-500/20 p-2.5 text-fuchsia-300">
          <ListMusic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Moods & Genres</h2>
          <p className="text-sm text-slate-400">
            Explore music by mood, style, or category.
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {[
          {
            name: "Chill",
            color:
              "from-blue-500/10 to-teal-500/5 border-blue-500/10 hover:border-blue-500/20 text-blue-300",
          },
          {
            name: "Energy",
            color:
              "from-amber-500/10 to-orange-500/5 border-amber-500/10 hover:border-amber-500/20 text-amber-300",
          },
          {
            name: "Focus",
            color:
              "from-indigo-500/10 to-purple-500/5 border-indigo-500/10 hover:border-indigo-500/20 text-indigo-300",
          },
          {
            name: "Workout",
            color:
              "from-red-500/10 to-pink-500/5 border-red-500/10 hover:border-red-500/20 text-red-300",
          },
          {
            name: "Feel Good",
            color:
              "from-emerald-500/10 to-teal-500/5 border-emerald-500/10 hover:border-emerald-500/20 text-emerald-300",
          },
          {
            name: "Party",
            color:
              "from-fuchsia-500/10 to-purple-500/5 border-fuchsia-500/10 hover:border-fuchsia-500/20 text-fuchsia-300",
          },
          {
            name: "Sad",
            color:
              "from-sky-500/10 to-blue-500/5 border-sky-500/10 hover:border-sky-500/20 text-sky-300",
          },
          {
            name: "Sleep",
            color:
              "from-violet-500/10 to-indigo-500/5 border-violet-500/10 hover:border-violet-500/20 text-violet-300",
          },
          {
            name: "Pop",
            color:
              "from-rose-500/10 to-pink-500/5 border-rose-500/10 hover:border-rose-500/20 text-rose-300",
          },
          {
            name: "Hip-Hop",
            color:
              "from-yellow-500/10 to-amber-500/5 border-yellow-500/10 hover:border-yellow-500/20 text-yellow-300",
          },
          {
            name: "Rock",
            color:
              "from-orange-500/10 to-red-500/5 border-orange-500/10 hover:border-orange-500/20 text-orange-300",
          },
          {
            name: "Electronic",
            color:
              "from-cyan-500/10 to-sky-500/5 border-cyan-500/10 hover:border-cyan-500/20 text-cyan-300",
          },
          {
            name: "Jazz",
            color:
              "from-amber-600/10 to-yellow-600/5 border-amber-600/10 hover:border-amber-600/20 text-yellow-400",
          },
          {
            name: "Indie",
            color:
              "from-lime-500/10 to-emerald-500/5 border-lime-500/10 hover:border-lime-500/20 text-lime-300",
          },
          {
            name: "Classical",
            color:
              "from-slate-500/10 to-zinc-500/5 border-slate-500/10 hover:border-slate-500/20 text-slate-300",
          },
        ].map((item) => (
          <button
            key={item.name}
            onClick={() => onExploreGenre(item.name)}
            className={`px-4 py-3 rounded-2xl border bg-gradient-to-br ${item.color} text-sm font-semibold text-center hover:scale-[1.02] active:scale-95 transition-all cursor-pointer truncate`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  );
};
