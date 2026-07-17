# Aria Music Player 🎵

Aria is a sleek, modern, cross-platform desktop music player built with **Tauri**, **React**, **TypeScript**, and **Tailwind CSS**. It leverages a custom Rust backend to search and stream music directly from YouTube, providing an ad-free, lightweight listening experience with a beautiful user interface.

## ✨ Features

- **Direct Music Streaming**: Search and play music seamlessly. The Rust backend handles parsing and direct audio stream extraction.
- **Rich Homepage**: Discover new music instantly with curated carousels fetched directly from the YouTube Music homepage (Quick Picks, Trending, New Releases).
- **Modern Minimalist UI**: A gorgeous dark-mode interface built with Tailwind CSS, featuring glassmorphism elements, micro-animations, and a highly polished custom media player.
- **Playlists & Favorites**: Create custom playlists, favorite your top tracks, and organize your music library locally.
- **Smart Search**: Filters out podcasts and irrelevant videos to ensure you're only searching for high-quality music tracks.
- **Lightweight & Fast**: Powered by Tauri (Rust), Aria uses a fraction of the memory compared to Electron-based music players.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React (icons)
- **Backend**: Rust, Tauri
- **State Management**: React Hooks (Custom App State)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- Rust and Cargo
- System dependencies for Tauri (e.g., Xcode command line tools for macOS, build-essential for Linux)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd demo_tauri_app
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run in Development Mode**

   ```bash
   pnpm tauri dev
   ```

   This will start the Vite dev server and open the Aria desktop window.

4. **Build for Production**
   ```bash
   pnpm tauri build
   ```
   This will create a standalone executable for your operating system in the `src-tauri/target/release/bundle` directory.

## 🎨 Design Philosophy

Aria is designed to be visually stunning. We prioritize:

- **Aesthetics**: Curated dark palettes (`#08090a`, `#12151b`) with subtle indigo and pink accents.
- **Interactivity**: Custom linear-gradient sliders for volume and playback progress, hover effects, and smooth transitions.
- **Focus**: No clutter, no ads—just you and your music.

## 📚 Documentation

For deeper technical insights, please refer to the files in the [`/docs`](./docs) folder:

- [**Architecture**](./docs/ARCHITECTURE.md): Learn about the system design and how the React frontend communicates with the Rust backend.
- [**YouTube API Integration**](./docs/YOUTUBE_API.md): Details on how Aria directly fetches YouTube streams and bypasses playback restrictions.
- [**Search Parsing**](./docs/SEARCH_PARSING.md): Explanation of how Aria parses and filters YouTube Music search results (e.g. dropping non-music episodes).
- [**Bugfixes & History**](./docs/BUGFIXES.md): A log of critical bugfixes, error handling implementations, and troubleshooting steps.

## 📄 License

This project is currently distributed under the MIT License.

## ⚠️ Usage Notice

Aria is intended for personal, non-commercial use only.

- Do not redistribute, resell, or rebrand this app without reviewing the legal and licensing implications first.
- You are responsible for making sure your use of the app complies with applicable laws, copyright rules, and YouTube's terms.
- The app is provided as-is, without warranty of any kind.
- This notice is informational only and does not override the MIT License.
- This notice is not legal advice and does not guarantee protection from legal claims, takedowns, or enforcement actions.

If you want enforceable personal-use-only restrictions, you need to change the license and get legal advice before distributing builds.

# Aria
