import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import speechRoutes from './routes/speech.js';
import { handleWebSocketConnection } from './websocket/speechHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const tempDir = path.join(__dirname, '../temp');
const publicAudioDir = path.join(__dirname, '../public/audio');

[tempDir, publicAudioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  useTempFiles: true,
  tempFileDir: tempDir, // Use absolute path for Windows compatibility
  createParentPath: true
}));

// Static files for generated audio
app.use('/audio', express.static(publicAudioDir));

// Routes
app.use('/api/speech', speechRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      groq: !!process.env.GROQ_API_KEY,
      typecast: !!process.env.TYPECAST_API_KEY
    },
    directories: {
      temp: fs.existsSync(tempDir),
      audio: fs.existsSync(publicAudioDir)
    }
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time streaming
const wss = new WebSocketServer({ server, path: '/ws/speech' });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  handleWebSocketConnection(ws);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

server.listen(PORT, () => {
  console.log(`
🍯 Honey Backend Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 HTTP:      http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}/ws/speech
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Endpoints:
   POST /api/speech/stt          - Speech to Text (Groq)
   POST /api/speech/tts          - Text to Speech (Typecast)
   POST /api/speech/chat         - Full chat pipeline
   POST /api/speech/chat/text    - Text chat
   GET  /api/speech/voices       - List voices
   GET  /api/speech/voices/miu   - Find Miu Kobayashi
   GET  /api/health              - Health check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Environment:
   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}
   TYPECAST_API_KEY: ${process.env.TYPECAST_API_KEY ? '✅ Set' : '❌ Missing'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
