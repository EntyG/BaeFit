# 🎀 BaeFit Frontend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd honey-fe
npm install
```

### 2. Create `.env` File (Optional)

If backend is not on `localhost:3001`, create `.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Development Server

```bash
npm run dev
```

Open: http://localhost:5173

## Troubleshooting

### Live2D Model Not Loading

1. **Check Cubism SDK**: Make sure `public/live2dcubismcore.min.js` exists
2. **Check Model Files**: Verify files in `public/live2d/yuki/`:
   - `c001_f_costume_kouma.model3.json`
   - `c001_f_costume_kouma.moc3`
   - `motions/` folder with all motion files
   - `textures/` folder with texture files

3. **Browser Console**: Press F12 → Console tab, check for errors

### Backend Connection Error

- Make sure backend is running: `cd ../honey-be && npm run dev`
- Check `VITE_API_URL` in `.env` matches backend port
- Check CORS settings in backend

### Audio Recording Not Working

- Allow microphone permissions in browser
- Use HTTPS or localhost (required for getUserMedia)
- Check browser console for errors

## Features

- 🎀 **Live2D Avatar** - Animated Megumin character
- 🎤 **Voice Chat** - Hold microphone button to record
- 💬 **Text Chat** - Type messages
- 🌙 **Day/Night Mode** - Toggle theme
- 😊 **Dynamic Expressions** - Megumin reacts with different moods

## Development

- **Hot Reload**: Changes auto-reload
- **Console Logs**: Check browser console (F12) for debug info
- **Network Tab**: Monitor API calls to backend

## Build for Production

```bash
npm run build
```

Output: `dist/` folder

