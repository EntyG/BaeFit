# 🚀 BaeFit Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd honey-be
npm install
```

### 2. Create `.env` File

Copy `env.example` to `.env`:

```bash
copy env.example .env
```

Then edit `.env` and add your API keys:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Groq API (Speech-to-Text + LLM)
# Get from: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Typecast.ai API (Text-to-Speech)
# Get from: https://typecast.ai
TYPECAST_API_KEY=your_typecast_api_key_here

# Typecast Voice Actor ID (Miu Kobayashi)
# Run: npm run find-voices to discover voice IDs
TYPECAST_ACTOR_ID=

# CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Find Miu Kobayashi Voice ID

After setting `TYPECAST_API_KEY`, run:

```bash
npm run find-voices
```

This will output something like:
```
🎀 FOUND MIU KOBAYASHI! 🎀
   Voice ID:   tc_xxxxxxxxxxxx
```

Copy the voice ID to `TYPECAST_ACTOR_ID` in your `.env` file.

### 4. Start Backend Server

```bash
npm run dev
```

You should see:
```
🍯 Honey Backend Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 HTTP:      http://localhost:3001
🔌 WebSocket: ws://localhost:3001/ws/speech
```

### 5. Test Health Endpoint

Open: http://localhost:3001/api/health

Should return:
```json
{
  "status": "ok",
  "services": {
    "groq": true,
    "typecast": true
  }
}
```

## Troubleshooting

### Error: "GROQ_API_KEY is not configured"
- Make sure `.env` file exists in `honey-be/` directory
- Check that `GROQ_API_KEY=your_key` is set (no quotes needed)

### Error: "TYPECAST_API_KEY is not configured"
- Set `TYPECAST_API_KEY` in `.env`
- Get your key from https://typecast.ai

### Error: "Cannot find module"
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

### File Upload Errors
- Check that `temp/` directory exists (created automatically)
- Check file size (max 50MB)

## API Endpoints

- `POST /api/speech/chat` - Full chat pipeline (voice → text → LLM → TTS)
- `POST /api/speech/chat/text` - Text chat only
- `POST /api/speech/stt` - Speech-to-text only
- `POST /api/speech/tts` - Text-to-speech only
- `GET /api/speech/voices` - List all voices
- `GET /api/speech/voices/miu` - Find Miu Kobayashi
- `GET /api/health` - Health check

## Next Steps

1. Start frontend: `cd ../honey-fe && npm run dev`
2. Open http://localhost:5173
3. Chat with Megumin! 🎀

