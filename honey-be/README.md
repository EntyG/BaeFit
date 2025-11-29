# 🎀 Honey Backend - Yuki Virtual Assistant

Backend server for **Yuki**, an anime-style virtual assistant who motivates healthy eating habits. Built with Groq AI (STT + LLM) and [Typecast.ai](https://typecast.ai/) (TTS).

## 🌸 Meet Yuki

> *Yuki is an interactive anime-style virtual assistant designed to motivate healthy eating habits. She lives in a charming "living room" interface and reacts to the user's dietary choices with personality-driven responses. Using AI, Yuki praises good meals and gently scolds unhealthy ones, all while reflecting mood changes through animated expressions.*

## 🔄 Complete Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SPEAKS TO YUKI                       │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     STEP 1: Groq Whisper (Speech-to-Text)                   │
│     User's voice → Text transcription                       │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     STEP 2: Groq LLM (Character Response)                   │
│     Generate Yuki's personality-driven response             │
│     Model: LLaMA 3.3 70B Versatile                          │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     STEP 3: Typecast.ai (Text-to-Speech)                    │
│     Yuki's response → Anime voice (Miu Kobayashi)           │
│     Returns: Audio URL + Lip-sync data                      │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     STEP 4: Avatar Animation Data                           │
│     - Lip sync visemes (Live2D/VRM compatible)              │
│     - Expression/mood (happy, pouty, concerned, etc.)       │
│     - Gestures (wave, nod, head_tilt, etc.)                 │
│     - Eye blinks                                             │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     Frontend plays audio + animates Live2D/VRM avatar       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd honey-be
npm install
```

### 2. Configure Environment

Create a `.env` file in the `honey-be` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Groq API (STT + LLM)
GROQ_API_KEY=your_groq_api_key_here

# Typecast.ai API (TTS - Miu Kobayashi voice)
TYPECAST_API_KEY=your_typecast_api_key_here
TYPECAST_ACTOR_ID=miu_kobayashi_actor_id

# CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Find Miu Kobayashi Voice ID

```bash
# Option 1: Use the discovery script
npm run find-voices

# Option 2: Start server and call the API
npm run dev
# Then open: http://localhost:3001/api/speech/voices/miu
```

This will output something like:
```
🎀 FOUND MIU KOBAYASHI! 🎀
   Voice ID:   tc_xxxxxxxxxxxx
   Name:       Miu Kobayashi
   Emotions:   normal, happy, sad, angry

📝 Add this to your .env file:
   TYPECAST_ACTOR_ID=tc_xxxxxxxxxxxx
```

### 4. Run the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### 🎤 Voice Discovery

| Endpoint | Description |
|----------|-------------|
| `GET /api/speech/voices` | List all available voices |
| `GET /api/speech/voices?model=ssfm-v21` | Filter by model |
| `GET /api/speech/voices/anime` | Get anime/Japanese voices |
| `GET /api/speech/voices/search/:name` | Search voice by name |
| `GET /api/speech/voices/miu` | Find Miu Kobayashi |
| `GET /api/speech/voices/:id` | Get voice details by ID |

**Example: Find Miu Kobayashi**
```bash
curl http://localhost:3001/api/speech/voices/miu
```

**Response:**
```json
{
  "success": true,
  "message": "Found Miu Kobayashi!",
  "data": {
    "id": "tc_62a8975e695ad26f7fb514d1",
    "name": "Miu Kobayashi",
    "language": "ja-JP",
    "emotions": ["normal", "happy", "sad", "angry"]
  },
  "usage": "Set TYPECAST_ACTOR_ID=tc_62a8975e695ad26f7fb514d1 in your .env file"
}
```

### Health Check
```
GET /api/health
```

### 🎀 Main Chat Endpoint (Recommended)
Talk to Yuki with voice input:
```
POST /api/speech/chat
Content-Type: multipart/form-data

Body:
- audio: Audio file (user's voice)
- language: "en" | "ja" | "vi" (default: "en")
- sessionId: Session ID for conversation history
- actorId: Typecast actor ID (Miu Kobayashi)
- context: Optional context for the conversation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": "I just had a salad for lunch!",
    "yukiResponse": {
      "text": "Sugoi~! A salad for lunch? That's amazing! I'm so proud of you! 🥗✨",
      "mood": "excited"
    },
    "audio": {
      "url": "https://typecast.ai/audio/...",
      "duration": 3500
    },
    "avatar": {
      "expression": { "type": "excited", "intensity": 1.0 },
      "lipSync": { "visemes": [...], "mouthShapes": {...} },
      "gestures": [{ "type": "bounce", "time": 0, "duration": 500 }],
      "eyeBlinks": [...],
      "bodyMovement": { "bounce": true, "sway": true, "intensity": 0.6 }
    },
    "sessionId": "abc123"
  }
}
```

### 💬 Text Chat
Chat with Yuki via text (no voice input):
```
POST /api/speech/chat/text
Content-Type: application/json

Body:
{
  "message": "I'm thinking of having pizza for dinner",
  "sessionId": "optional",
  "actorId": "miu_kobayashi_id",
  "context": "optional context"
}
```

### 🍽️ Meal Reaction
Get Yuki's reaction to a meal:
```
POST /api/speech/meal-reaction
Content-Type: application/json

Body:
{
  "mealDescription": "Pepperoni pizza with extra cheese",
  "isHealthy": false,
  "calories": 450,
  "nutrients": "High fat, moderate protein",
  "actorId": "miu_kobayashi_id"
}
```

### Other Endpoints
- `POST /api/speech/stt` - Speech-to-Text only
- `POST /api/speech/tts` - Text-to-Speech only
- `GET /api/speech/actors` - List Typecast voices
- `DELETE /api/speech/history/:sessionId` - Clear chat history

## 🔌 WebSocket API

Connect to `ws://localhost:3001/ws/speech`

### Commands

#### Start Voice Recording
```json
{
  "type": "start_recording",
  "language": "en"
}
```

#### Stop Recording & Get Yuki's Response
```json
{
  "type": "stop_recording",
  "actorId": "miu_kobayashi_id",
  "context": "optional context"
}
```

#### Text Chat (WebSocket)
```json
{
  "type": "chat_text",
  "message": "Hello Yuki!",
  "actorId": "miu_kobayashi_id"
}
```

#### Meal Reaction (WebSocket)
```json
{
  "type": "meal_reaction",
  "mealDescription": "Grilled chicken with vegetables",
  "isHealthy": true,
  "calories": 350,
  "actorId": "miu_kobayashi_id"
}
```

### Response Events

- `connected` - Connection established with Yuki
- `recording_started` - Yuki is listening
- `processing` - Processing stage (stt/thinking/tts/complete)
- `user_message` - Transcribed user message
- `yuki_thinking` - Yuki's response text (before voice)
- `yuki_response` - Complete response with audio and avatar data
- `meal_reaction` - Yuki's meal reaction
- `error` - Error occurred

## 😊 Yuki's Moods

Yuki expresses different moods based on the conversation:

| Mood | Trigger | Avatar Expression |
|------|---------|-------------------|
| `happy` | Good meal choices, positive interactions | Smiling, gentle sway |
| `excited` | Achievements, trying healthy foods | Bouncing, wide smile |
| `concerned` | Unhealthy choices | Worried look, lean forward |
| `pouty` | Ignoring advice | Puffed cheeks, slight turn away |
| `encouraging` | Motivating the user | Nodding, warm expression |
| `thinking` | Giving advice | Head tilt, thoughtful look |
| `surprised` | Unexpected news | Wide eyes, jump back |

## 🎭 Avatar Animation Data

### Expression
```json
{
  "type": "excited",
  "intensity": 1.0
}
```

### Lip Sync (Live2D/VRM Compatible)
```json
{
  "visemes": [
    { "time": 0, "duration": 100, "viseme": "AA", "value": 0.9 },
    { "time": 100, "duration": 80, "viseme": "E", "value": 0.6 }
  ],
  "mouthShapes": {
    "AA": { "mouth_open": 0.9, "mouth_form": 0.5 },
    "a": { "mouth_open": 0.8, "mouth_form": 0.5 }
  }
}
```

### Gestures
```json
[
  { "type": "bounce", "time": 0, "duration": 500 },
  { "type": "nod", "time": 200, "duration": 400 }
]
```

**Available Gestures:**
- `wave` - Greeting
- `nod` - Agreement
- `head_shake` - Disagreement
- `head_tilt` - Curiosity/thinking
- `bounce` - Excitement
- `puff_cheeks` - Pouting
- `clap` - Celebration
- `emphasis` - Exclamation

### Body Movement
```json
{
  "bounce": true,
  "sway": true,
  "intensity": 0.6
}
```

## 🔑 Getting API Keys

### Groq API
1. Visit [console.groq.com](https://console.groq.com)
2. Create an account and generate an API key
3. Used for: Speech-to-Text (Whisper) + LLM (LLaMA)

### Typecast.ai API
1. Visit [typecast.ai](https://typecast.ai/)
2. Sign up for a developer account
3. Get your API key and find **Miu Kobayashi** actor ID
4. Used for: Anime voice synthesis

## 📁 Project Structure

```
honey-be/
├── src/
│   ├── index.js                 # Main server + WebSocket
│   ├── routes/
│   │   └── speech.js            # REST API routes
│   ├── services/
│   │   ├── groqService.js       # Groq STT + LLM (Yuki's brain)
│   │   └── typecastService.js   # Typecast TTS (Yuki's voice)
│   └── websocket/
│       └── speechHandler.js     # Real-time chat handler
├── public/audio/                # Generated audio cache
├── temp/                        # Temporary processing files
├── package.json
├── env.example
└── README.md
```

## 🛠 Tech Stack

- **Runtime**: Node.js + Express
- **STT**: Groq Whisper Large V3 Turbo
- **LLM**: Groq LLaMA 3.3 70B Versatile
- **TTS**: [Typecast.ai](https://typecast.ai/) (Miu Kobayashi)
- **WebSocket**: ws
- **Avatar**: Live2D / VRM compatible data

## 📝 Example Conversation

```
User: "I just had a burger and fries for lunch"

Yuki (concerned): [concerned] Oh no~ A burger and fries? 
That's a lot of grease, you know... I'm a bit worried about you! 
Maybe try adding a side salad next time? Ganbatte!

User: "Okay, I'll have a salad for dinner"

Yuki (happy): [happy] Yay~! That's what I like to hear! 
A salad for dinner sounds perfect! I knew you could make better choices! 
I'm so proud of you! ✨
```

## 📝 License

MIT
