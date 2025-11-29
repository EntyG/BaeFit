import groqService from '../services/groqService.js';
import typecastService from '../services/typecastService.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handle WebSocket connection for real-time Megumin chat
 * @param {WebSocket} ws - WebSocket connection
 */
export function handleWebSocketConnection(ws) {
  let audioChunks = [];
  let isRecording = false;
  let sessionId = uuidv4();

  console.log(`🎀 Megumin session started: ${sessionId}`);

  ws.on('message', async (message) => {
    try {
      // Try to parse as JSON command
      let data;
      try {
        data = JSON.parse(message);
      } catch {
        // Binary audio data
        if (isRecording) {
          audioChunks.push(message);
          return;
        }
      }

      if (!data) return;

      switch (data.type) {
        case 'start_recording':
          handleStartRecording(ws, data, () => {
            isRecording = true;
            audioChunks = [];
          });
          break;

        case 'stop_recording':
          isRecording = false;
          await handleStopRecording(ws, audioChunks, data, sessionId);
          audioChunks = [];
          break;

        case 'audio_chunk':
          if (data.chunk && isRecording) {
            audioChunks.push(Buffer.from(data.chunk, 'base64'));
          }
          break;

        case 'chat':
          // Full chat pipeline with audio
          await handleFullChat(ws, data, sessionId);
          break;

        case 'chat_text':
          // Text-only chat
          await handleTextChat(ws, data, sessionId);
          break;

        case 'tts':
          // TTS only (no LLM)
          await handleTTS(ws, data);
          break;

        case 'meal_reaction':
          // Megumin reacts to a meal
          await handleMealReaction(ws, data, sessionId);
          break;

        case 'clear_history':
          groqService.clearHistory(sessionId);
          ws.send(JSON.stringify({
            type: 'history_cleared',
            sessionId
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown command: ${data.type}` 
          }));
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: error.message 
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🎀 Megumin session closed: ${sessionId}`);
    audioChunks = [];
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error (${sessionId}):`, error);
  });

  // Send welcome message from Megumin
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId,
    message: 'Megumin is ready to chat!',
    character: {
      name: 'Megumin',
      description: 'Your anime virtual assistant for healthy eating',
      defaultMood: 'happy'
    },
    capabilities: ['chat', 'chat_text', 'tts', 'meal_reaction']
  }));
}

/**
 * Handle start recording command
 */
function handleStartRecording(ws, data, callback) {
  console.log('🎤 Recording started');
  
  ws.send(JSON.stringify({
    type: 'recording_started',
    timestamp: Date.now(),
    language: data.language || 'en',
    message: 'Megumin is listening...'
  }));

  callback();
}

/**
 * Handle stop recording and full chat pipeline
 */
async function handleStopRecording(ws, audioChunks, data, sessionId) {
  console.log(`🛑 Recording stopped. Chunks: ${audioChunks.length}`);

  if (audioChunks.length === 0) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'No audio data received'
    }));
    return;
  }

  const audioBuffer = Buffer.concat(audioChunks);
  const tempFilePath = path.join('temp', `${uuidv4()}.webm`);

  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp', { recursive: true });
  }

  fs.writeFileSync(tempFilePath, audioBuffer);

  try {
    // ═══════════════════════════════════════
    // STEP 1: Speech to Text
    // ═══════════════════════════════════════
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'stt',
      progress: 25,
      message: 'Understanding what you said...'
    }));

    const sttResult = await groqService.speechToText(tempFilePath, {
      language: data.language || 'en'
    });

    ws.send(JSON.stringify({
      type: 'user_message',
      text: sttResult.text
    }));

    // ═══════════════════════════════════════
    // STEP 2: Generate Megumin's Response
    // ═══════════════════════════════════════
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'thinking',
      progress: 50,
      message: 'Megumin is thinking...'
    }));

    const llmResult = await groqService.generateCharacterResponse(
      sttResult.text,
      sessionId,
      { context: data.context }
    );

    ws.send(JSON.stringify({
      type: 'yuki_thinking',
      text: llmResult.text,
      mood: llmResult.mood
    }));

    // ═══════════════════════════════════════
    // STEP 3: Generate Megumin's Voice
    // ═══════════════════════════════════════
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'tts',
      progress: 75,
      message: 'Megumin is preparing to speak...'
    }));

    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    const ttsResult = await typecastService.textToSpeech(llmResult.text, {
      actorId: data.actorId,
      emotion: typecastEmotion
    });

    // ═══════════════════════════════════════
    // STEP 4: Complete with Avatar Data
    // ═══════════════════════════════════════
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'complete',
      progress: 100,
      message: 'Ready!'
    }));

    const avatarData = prepareAvatarData(llmResult, ttsResult);

    ws.send(JSON.stringify({
      type: 'yuki_response',
      userMessage: sttResult.text,
      yukiResponse: {
        text: llmResult.text,
        mood: llmResult.mood
      },
      audio: {
        url: ttsResult.audioUrl,
        duration: ttsResult.duration
      },
      avatar: avatarData,
      sessionId
    }));

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

/**
 * Handle text-only chat
 */
async function handleTextChat(ws, data, sessionId) {
  if (!data.message) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Message is required'
    }));
    return;
  }

  try {
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'thinking',
      message: 'Megumin is thinking...'
    }));

    // Generate response
    const llmResult = await groqService.generateCharacterResponse(
      data.message,
      sessionId,
      { context: data.context }
    );

    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'tts',
      message: 'Megumin is preparing to speak...'
    }));

    // Generate voice
    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    const ttsResult = await typecastService.textToSpeech(llmResult.text, {
      actorId: data.actorId,
      emotion: typecastEmotion
    });

    const avatarData = prepareAvatarData(llmResult, ttsResult);

    ws.send(JSON.stringify({
      type: 'yuki_response',
      userMessage: data.message,
      yukiResponse: {
        text: llmResult.text,
        mood: llmResult.mood
      },
      audio: {
        url: ttsResult.audioUrl,
        duration: ttsResult.duration
      },
      avatar: avatarData,
      sessionId
    }));

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

/**
 * Handle full chat with base64 audio
 */
async function handleFullChat(ws, data, sessionId) {
  if (!data.audio) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Audio data is required'
    }));
    return;
  }

  const audioBuffer = Buffer.from(data.audio, 'base64');
  const tempFilePath = path.join('temp', `${uuidv4()}.${data.format || 'webm'}`);

  if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp', { recursive: true });
  }

  fs.writeFileSync(tempFilePath, audioBuffer);

  try {
    // Step 1: STT
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'stt',
      progress: 20,
      message: 'Listening to you...'
    }));

    const sttResult = await groqService.speechToText(tempFilePath, {
      language: data.language || 'en'
    });

    ws.send(JSON.stringify({
      type: 'user_message',
      text: sttResult.text
    }));

    // Step 2: LLM Response
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'thinking',
      progress: 45,
      message: 'Megumin is thinking...'
    }));

    const llmResult = await groqService.generateCharacterResponse(
      sttResult.text,
      sessionId,
      { context: data.context }
    );

    // Step 3: TTS
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'tts',
      progress: 70,
      message: 'Generating voice...'
    }));

    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    const ttsResult = await typecastService.textToSpeech(llmResult.text, {
      actorId: data.actorId,
      emotion: typecastEmotion
    });

    // Step 4: Complete
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'complete',
      progress: 100,
      message: 'Ready!'
    }));

    const avatarData = prepareAvatarData(llmResult, ttsResult);

    ws.send(JSON.stringify({
      type: 'yuki_response',
      userMessage: sttResult.text,
      yukiResponse: {
        text: llmResult.text,
        mood: llmResult.mood
      },
      audio: {
        url: ttsResult.audioUrl,
        duration: ttsResult.duration
      },
      avatar: avatarData,
      sessionId
    }));

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

/**
 * Handle TTS only (no LLM)
 */
async function handleTTS(ws, data) {
  if (!data.text) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Text is required for TTS'
    }));
    return;
  }

  try {
    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'tts',
      message: 'Generating speech...'
    }));

    const result = await typecastService.textToSpeech(data.text, {
      actorId: data.actorId,
      emotion: data.emotion || 'normal',
      tempo: data.tempo || 1.0
    });

    ws.send(JSON.stringify({
      type: 'tts_result',
      text: data.text,
      audioUrl: result.audioUrl,
      duration: result.duration,
      lipSync: result.lipSync
    }));

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

/**
 * Handle meal reaction
 */
async function handleMealReaction(ws, data, sessionId) {
  const { mealDescription, isHealthy, calories, nutrients } = data;

  if (!mealDescription) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Meal description is required'
    }));
    return;
  }

  try {
    // Build context
    const context = `The user is showing their meal: "${mealDescription}". 
    Health assessment: ${isHealthy ? 'This is a healthy choice!' : 'This could be healthier...'}
    ${calories ? `Calories: ~${calories}` : ''}
    ${nutrients ? `Key nutrients: ${nutrients}` : ''}`;

    const message = isHealthy 
      ? "Look at my meal! What do you think?"
      : "I'm about to eat this...";

    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'thinking',
      message: 'Megumin is looking at your meal...'
    }));

    // Generate reaction
    const llmResult = await groqService.generateCharacterResponse(
      message,
      sessionId,
      { context }
    );

    ws.send(JSON.stringify({
      type: 'processing',
      stage: 'tts',
      message: 'Megumin is preparing her reaction...'
    }));

    // Generate voice
    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    const ttsResult = await typecastService.textToSpeech(llmResult.text, {
      actorId: data.actorId,
      emotion: typecastEmotion
    });

    const avatarData = prepareAvatarData(llmResult, ttsResult);

    ws.send(JSON.stringify({
      type: 'meal_reaction',
      meal: mealDescription,
      isHealthy,
      yukiResponse: {
        text: llmResult.text,
        mood: llmResult.mood
      },
      audio: {
        url: ttsResult.audioUrl,
        duration: ttsResult.duration
      },
      avatar: avatarData,
      sessionId
    }));

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

/**
 * Map mood to Typecast emotion
 */
function mapMoodToEmotion(mood) {
  const moodMap = {
    'happy': 'happy',
    'excited': 'happy',
    'concerned': 'sad',
    'pouty': 'angry',
    'encouraging': 'happy',
    'thinking': 'normal',
    'surprised': 'happy',
    'sad': 'sad',
    'angry': 'angry',
    'neutral': 'normal'
  };
  return moodMap[mood] || 'normal';
}

/**
 * Prepare avatar animation data
 */
function prepareAvatarData(llmResult, ttsResult) {
  const lipSync = ttsResult.lipSync || { visemes: [], mouthShapes: {} };
  const mood = llmResult.mood || 'neutral';
  
  return {
    timeline: {
      duration: ttsResult.duration || 0,
      fps: 60
    },
    expression: {
      type: mood,
      intensity: getExpressionIntensity(mood)
    },
    lipSync: {
      visemes: lipSync.visemes,
      mouthShapes: lipSync.mouthShapes
    },
    gestures: generateGestures(llmResult.text, mood),
    eyeBlinks: generateEyeBlinks(ttsResult.duration || 0),
    bodyMovement: generateBodyMovement(mood)
  };
}

function getExpressionIntensity(mood) {
  const intensityMap = {
    'happy': 0.8,
    'excited': 1.0,
    'concerned': 0.6,
    'pouty': 0.7,
    'encouraging': 0.7,
    'thinking': 0.4,
    'surprised': 0.9,
    'sad': 0.6,
    'angry': 0.5,
    'neutral': 0.3
  };
  return intensityMap[mood] || 0.5;
}

function generateGestures(text, mood) {
  const gestures = [];
  const lower = (text || '').toLowerCase();

  // Mood-based
  if (mood === 'excited' || mood === 'happy') {
    gestures.push({ type: 'bounce', time: 0, duration: 500 });
  }
  if (mood === 'pouty') {
    gestures.push({ type: 'puff_cheeks', time: 0, duration: 1000 });
  }
  if (mood === 'thinking') {
    gestures.push({ type: 'head_tilt', time: 0, duration: 800 });
  }

  // Text-based
  if (lower.includes('?')) {
    gestures.push({ type: 'head_tilt', time: 200, duration: 500 });
  }
  if (lower.includes('!')) {
    gestures.push({ type: 'emphasis', time: 0, duration: 400 });
  }
  if (lower.includes('great') || lower.includes('sugoi')) {
    gestures.push({ type: 'clap', time: 0, duration: 800 });
  }

  return gestures;
}

function generateEyeBlinks(durationMs) {
  const blinks = [];
  let time = 800;

  while (time < durationMs) {
    blinks.push({ time, duration: 120 });
    time += 3000 + Math.random() * 3000;
  }

  return blinks;
}

function generateBodyMovement(mood) {
  const movements = {
    'happy': { sway: true, intensity: 0.3 },
    'excited': { bounce: true, sway: true, intensity: 0.6 },
    'concerned': { lean_forward: true, intensity: 0.2 },
    'pouty': { turn_away: true, intensity: 0.3 },
    'encouraging': { lean_forward: true, nod: true, intensity: 0.4 },
    'thinking': { head_tilt: true, intensity: 0.2 },
    'surprised': { jump_back: true, intensity: 0.5 },
    'neutral': { idle: true, intensity: 0.1 }
  };
  
  return movements[mood] || movements['neutral'];
}
