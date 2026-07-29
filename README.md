# Lulu seek

`Lulu seek` is a high-performance, real-time, top-down multiplayer hide-and-seek game designed with a polished cyber/brutalist terminal aesthetic. Built with React (Vite), TypeScript, and custom state synchronization, it supports instant lobby joining, real-time movement, collision detection, and automated seeker tag interactions.

---

## 🎮 Features

- **Real-Time Multiplayer Sync**: Low-latency coordinate and game state synchronization.
- **Auto-Balanced Role Distribution**: Intelligent calculation of hider-to-seeker ratios based on lobby size.
- **Dynamic Arena Elements**:
  - **Cyber Bushes**: Walk inside them to completely hide from seeker Line-of-Sight (LoS) unless they enter the exact same bush.
  - **Stone Obstacles & Trees**: Full circular/box collision handling.
- **Host Controls**: Full configuration of player limit, hide countdown timer, and match duration.
- **Responsive Controls**: Fully responsive desktop keys (WASD/Arrows) and an integrated mobile Virtual Joystick.
- **Cyberpunk UI**: Visually distinct neon-green scanline interfaces, glitchy fonts, status logs, and precise displays.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **State Synchronization & Physics**: Native HTML5 Canvas and responsive animation loop (RequestAnimationFrame)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)

---

## 📂 Project Structure

```text
├── assets/                  # Public assets, static files, and media
├── src/
│   ├── components/
│   │   ├── GameView.tsx     # Game playing arena, canvas renderer, keyboard/mobile input handles
│   │   ├── LobbyView.tsx    # Room customization, player roster, host controls, readiness sync
│   │   └── JoinView.tsx     # Landing screen, nickname selector, and room joiner/creator
│   ├── App.tsx              # Main orchestrator, local/cloud network messaging router
│   ├── map.ts               # Circular & rectangular collision physics and map obstacles data
│   ├── types.ts             # Shared Game, Player, Room, and Settings interfaces
│   ├── index.css            # Global stylesheet with Tailwind CSS and font theme bindings
│   └── main.tsx             # Application entry point
├── .env.example             # Documented environment variables layout
├── .gitignore               # Configured file omissions for git
├── metadata.json            # AI Studio Applet capabilities and descriptors
└── tsconfig.json            # TypeScript build parameters
```

---

## ⚙️ Installation & Setup

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and npm/bun installed.

### 1. Clone & Install Dependencies

```bash
# Clone the repository (or extract files)
cd lulu-seek

# Install packages
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root of your project:

```bash
cp .env.example .env
```

Define any local settings required:

```env
GEMINI_API_KEY="your-gemini-key-if-required"
APP_URL="http://localhost:3000"
```

---

## 🚀 Running the App

### Development Server

Launch the dev server on standard port `3000`:

```bash
npm run dev
```

### Building for Production

Compile typescript elements and build assets:

```bash
npm run build
```

### Starting the Production Build

```bash
npm run start
```

---

## 🕹️ How to Play

1. **Enter Arena**: Choose an alias, then either **Create a Room** or enter a friends' **Connection Code** to join.
2. **Set up settings**: The host can adjust the seeker counts, hider escape times, and game limits.
3. **Toggle Ready**: Every non-host player must check in as **Ready** before the match can launch.
4. **Hiding Phase**: Hiders have a head start to disperse and hide inside **green cyber-bushes** (which grant partial/full invisibility).
5. **Seeking Phase**: Seekers are released! Touch any hider directly to tag them and earn score. Tag all hiders to win, or hold out as a hider until the match timer runs out to secure victory.

---

## 🔒 Security & Safe Pushing

This project enforces strict zero-leak security rules. Under no circumstances are `.env` files, actual client credentials, or API keys committed to git. Ensure any modifications respect the preset exclusion rules in `.gitignore`.

---

## 📄 License

MIT License. See LICENSE (if created) for details.
