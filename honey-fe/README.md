# 🍯 BaeFit Frontend - Chat with Yuki

A beautiful anime-style virtual assistant interface featuring **Yuki**, a Live2D character who motivates healthy eating habits.

## ✨ Features

- 🎀 **Live2D Avatar** - Animated Yuki character with mood-based expressions
- 🎤 **Voice Chat** - Hold to record, release to send
- 💬 **Text Chat** - Type messages to chat
- 🌙 **Day/Night Mode** - Beautiful ambient themes
- 🎭 **Dynamic Moods** - Yuki expresses: happy, excited, concerned, pouty, etc.
- 🔊 **Text-to-Speech** - Yuki speaks with anime voice (Typecast.ai)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd honey-fe
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Make sure Backend is Running

```bash
cd ../honey-be
npm run dev
```

## 📁 Project Structure

```
honey-fe/
├── public/
│   └── live2d/
│       └── yuki/                    # Live2D model files
│           ├── c001_f_costume_kouma.moc3
│           ├── c001_f_costume_kouma.model3.json
│           ├── motions/             # Expression animations
│           └── textures/            # Character textures
├── src/
│   ├── components/
│   │   ├── Live2DCanvas.jsx        # Live2D renderer
│   │   ├── ChatInterface.jsx       # Chat UI with voice
│   │   └── MoodIndicator.jsx       # Mood display badge
│   ├── services/
│   │   └── api.js                  # Backend API client
│   ├── App.jsx                     # Main application
│   ├── App.css                     # Styles & themes
│   └── main.jsx                    # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## 🎭 Available Moods & Motions

| Mood | Motion File | Trigger |
|------|-------------|---------|
| Happy | `02_fun.motion3.json` | Good food choices |
| Excited | `I_fun_motion_01.motion3.json` | Achievements |
| Concerned | `04_sad.motion3.json` | Unhealthy choices |
| Pouty | `01_angry.motion3.json` | Ignoring advice |
| Surprised | `03_surprised.motion3.json` | Unexpected input |
| Sad | `I_f_sad__motion_01.motion3.json` | Bad news |
| Angry | `I_angry_motion_01.motion3.json` | Very unhealthy |
| Neutral | `00_nomal.motion3.json` | Default |
| Idle | `I_idling_motion_01.motion3.json` | Waiting |
| Shy | `07_tere.motion3.json` | Compliments |

## 🎨 Themes

### Night Mode (Default)
- Deep purple/indigo gradient
- Twinkling stars
- Rose accent colors
- Cozy ambient feel

### Day Mode
- Warm peach/coral gradient
- Soft floating particles
- Light rose accents
- Cheerful atmosphere

## 🔧 Tech Stack

- **Framework**: React 19 + Vite
- **Live2D**: pixi-live2d-display + PIXI.js
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **HTTP**: Axios

## 📱 Responsive Design

- Desktop: Side-by-side avatar and chat
- Tablet: Stacked layout
- Mobile: Optimized touch controls

## 🎤 Voice Chat Usage

1. **Click & Hold** the microphone button
2. **Speak** your message
3. **Release** to send
4. Wait for Yuki's response with voice!

## 📝 License

MIT
