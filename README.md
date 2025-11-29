# 🍯 BaeFit - Megumin Virtual Assistant

A complete anime-style virtual assistant application featuring **Megumin**, a Live2D character who motivates healthy eating habits through voice and text chat.

## 🌸 Features

- 🎀 **Live2D Avatar** - Animated Megumin character with mood-based expressions
- 🎤 **Voice Chat** - Real-time speech-to-text using Groq Whisper
- 🤖 **AI Responses** - Groq LLaMA generates Megumin's personality-driven responses
- 🔊 **Anime Voice** - Typecast.ai TTS with Miu Kobayashi voice
- 💬 **Text Chat** - Alternative text-based chat interface
- 🌙 **Beautiful UI** - Cozy living room theme with day/night modes
- 🎭 **Dynamic Expressions** - Megumin reacts with different moods (happy, concerned, pouty, etc.)

## 📁 Project Structure

```
BaeFit/
├── honey-be/          # Backend (Node.js + Express)
│   ├── src/
│   │   ├── services/  # Groq STT/LLM + Typecast TTS
│   │   ├── routes/    # API endpoints
│   │   └── websocket/ # Real-time chat handler
│   └── SETUP.md       # Backend setup guide
│
├── honey-fe/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ # Live2D, Chat, UI components
│   │   └── services/    # API client
│   └── SETUP.md        # Frontend setup guide
│
└── c001_f_costume_kouma/  # Live2D model files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API Keys:
  - [Groq API Key](https://console.groq.com) (for STT + LLM)
  - [Typecast API Key](https://typecast.ai) (for TTS)

### Step 1: Backend Setup

```bash
cd honey-be

# Install dependencies
npm install

# Create .env file
copy env.example .env
# Edit .env and add your API keys

# Find Miu Kobayashi voice ID
npm run find-voices
# Copy the voice ID to TYPECAST_ACTOR_ID in .env

# Start backend
npm run dev
```

Backend runs on: http://localhost:3001

### Step 2: Frontend Setup

```bash
cd honey-fe

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend runs on: http://localhost:5173

### Step 3: Chat with Megumin! 🎀

1. Open http://localhost:5173
2. **Hold** the 🎤 button and speak
3. Megumin will respond with voice and animation!

## 🔄 Complete Pipeline

```
User Speech (Audio)
      ↓
Groq Whisper (STT) → Text
      ↓
Groq LLaMA (LLM) → Megumin's Response
      ↓
Typecast.ai (TTS) → Anime Voice
      ↓
Live2D Avatar → Animated Expression
```

## 📡 API Endpoints

### Backend (`honey-be`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/speech/chat` | POST | Full chat pipeline (voice) |
| `/api/speech/chat/text` | POST | Text chat |
| `/api/speech/stt` | POST | Speech-to-text only |
| `/api/speech/tts` | POST | Text-to-speech only |
| `/api/speech/voices` | GET | List all voices |
| `/api/speech/voices/miu` | GET | Find Miu Kobayashi |
| `/api/health` | GET | Health check |

### Frontend (`honey-fe`)

- **Voice Chat**: Hold microphone button
- **Text Chat**: Type and press Enter
- **Settings**: Click gear icon
- **Day/Night**: Toggle moon/sun icon

## 🎭 Megumin's Moods

| Mood | Trigger | Expression |
|------|---------|------------|
| 😊 Happy | Good meal choices | `02_fun.motion3.json` |
| 🤩 Excited | Achievements | `I_fun_motion_01.motion3.json` |
| 😟 Concerned | Unhealthy choices | `04_sad.motion3.json` |
| 😤 Pouty | Ignoring advice | `01_angry.motion3.json` |
| 🤔 Thinking | Giving advice | `00_nomal.motion3.json` |
| 😲 Surprised | Unexpected input | `03_surprised.motion3.json` |

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **STT**: Groq Whisper Large V3 Turbo
- **LLM**: Groq LLaMA 3.3 70B Versatile
- **TTS**: Typecast.ai API
- **WebSocket**: ws

### Frontend
- **Framework**: React 19 + Vite
- **Live2D**: pixi-live2d-display + PIXI.js v7
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **HTTP**: Axios

## 📝 Environment Variables

### Backend (`honey-be/.env`)

```env
PORT=3001
GROQ_API_KEY=your_groq_key
TYPECAST_API_KEY=your_typecast_key
TYPECAST_ACTOR_ID=voice_id_from_find-voices
FRONTEND_URL=http://localhost:5173
```

### Frontend (`honey-fe/.env`)

```env
VITE_API_URL=http://localhost:3001
```

## 🐛 Troubleshooting

### Backend Issues

**"GROQ_API_KEY is not configured"**
- Check `.env` file exists in `honey-be/`
- Verify API key is set (no quotes)

**"Cannot find module"**
- Run `npm install` in `honey-be/`

**File upload errors**
- Check `temp/` directory exists
- Verify file size < 50MB

### Frontend Issues

**Live2D not loading**
- Check `public/live2dcubismcore.min.js` exists
- Verify model files in `public/live2d/yuki/`
- Check browser console (F12)

**Backend connection error**
- Ensure backend is running on port 3001
- Check `VITE_API_URL` in `.env`

**Microphone not working**
- Allow browser permissions
- Use HTTPS or localhost

## 📚 Documentation

- [Backend Setup](./honey-be/SETUP.md)
- [Frontend Setup](./honey-fe/SETUP.md)
- [Backend API Docs](./honey-be/README.md)
- [Groq API Docs](https://console.groq.com/docs)
- [Typecast API Docs](https://typecast.ai/docs)

## 🎯 Next Steps

1. ✅ Set up API keys
2. ✅ Start backend and frontend
3. ✅ Test voice chat
4. ✅ Customize Megumin's personality (edit `groqService.js`)
5. ✅ Add more meal reactions
6. ✅ Deploy to production

## 📄 License

MIT

## 🙏 Credits

- **Live2D Model**: c001_f_costume_kouma
- **Groq**: Speech-to-text and LLM
- **Typecast.ai**: Text-to-speech
- **PIXI.js**: Graphics rendering

---

Made with ❤️ for healthy eating habits! 🍯🎀

