import React from "react";

interface CreatePlaylistModalProps {
  newPlaylistName: string;
  setNewPlaylistName: (name: string) => void;
  createPlaylist: () => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  newPlaylistName,
  setNewPlaylistName,
  createPlaylist,
  setShowCreatePlaylistModal,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
      <div className="bg-[#0e1015] border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white">Create new playlist</h3>
        <input
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="e.g. Chill Beats, Heavy Metal"
          className="w-full px-4 py-3 rounded-xl bg-[#12151b] border border-white/5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-slate-700"
        />
        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={() => setShowCreatePlaylistModal(false)}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={createPlaylist}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold shadow-md text-sm cursor-pointer"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
