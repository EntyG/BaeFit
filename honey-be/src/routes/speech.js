import express from 'express';
import groqService from '../services/groqService.js';
import typecastService from '../services/typecastService.js';
import fs from 'fs';

const router = express.Router();

/**
 * POST /api/speech/stt
 * Convert speech audio to text using Groq
 */
router.post('/stt', async (req, res, next) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioFile = req.files.audio;
    const { language = 'en' } = req.body;

    console.log(`📥 Received audio: ${audioFile.name} (${audioFile.size} bytes)`);

    const result = await groqService.speechToText(audioFile.tempFilePath, {
      language
    });

    // Clean up temp file
    if (audioFile.tempFilePath && fs.existsSync(audioFile.tempFilePath)) {
      fs.unlinkSync(audioFile.tempFilePath);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/speech/tts
 * Convert text to speech using Typecast.ai
 */
router.post('/tts', async (req, res, next) => {
  try {
    const { 
      text, 
      actorId, 
      emotion = 'normal',
      tempo = 1.0,
      pitch = 0 
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`📝 TTS Request: "${text.substring(0, 50)}..."`);

    const result = await typecastService.textToSpeech(text, {
      actorId,
      emotion,
      tempo,
      pitch
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/speech/chat
 * Main chat endpoint: User speaks → Megumin responds with voice
 * Full pipeline: STT → LLM Response → TTS → Avatar Data
 */
router.post('/chat', async (req, res, next) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioFile = req.files.audio;
    const { 
      language = 'en',
      sessionId = 'default',
      actorId, // Miu Kobayashi from Typecast
      context = null, // Optional context (e.g., meal being discussed)
      downloadAudio = false
    } = req.body;

    console.log(`\n🎀 ═══════════════════════════════════════`);
    console.log(`🎀 Megumin Chat Pipeline Starting...`);
    console.log(`🎀 ═══════════════════════════════════════\n`);

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Speech-to-Text (User's voice → Text)
    // ═══════════════════════════════════════════════════════════
    console.log('📍 Step 1/4: Converting user speech to text...');
    const sttResult = await groqService.speechToText(audioFile.tempFilePath, {
      language
    });

    if (!sttResult.text) {
      throw new Error('Could not understand the audio');
    }

    console.log(`👤 User said: "${sttResult.text}"`);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Generate Megumin's Response (LLM)
    // ═══════════════════════════════════════════════════════════
    console.log('📍 Step 2/4: Megumin is thinking...');
    const llmResult = await groqService.generateCharacterResponse(
      sttResult.text,
      sessionId,
      { context }
    );

    console.log(`🎀 Megumin responds: "${llmResult.text}"`);
    console.log(`😊 Mood: ${llmResult.mood}`);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Text-to-Speech (Megumin's response → Anime voice)
    // ═══════════════════════════════════════════════════════════
    console.log('📍 Step 3/4: Generating Megumin\'s voice...');
    
    // Map Megumin's mood to Typecast emotion
    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    let ttsResult;
    let useFallback = false;
    
    try {
      ttsResult = await typecastService.textToSpeech(llmResult.text, {
        actorId, // Miu Kobayashi or chosen actor
        emotion: typecastEmotion,
        tempo: 1.0
      });
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, client will use fallback audio:', ttsError.message);
      useFallback = true;
      const estimatedDuration = Math.max(llmResult.text.length * 80, 1000);
      ttsResult = {
        success: false,
        audioUrl: null,
        duration: estimatedDuration,
        lipSync: typecastService.generateLipSyncData(llmResult.text, estimatedDuration)
      };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Prepare Avatar Animation Data
    // ═══════════════════════════════════════════════════════════
    console.log('📍 Step 4/4: Preparing avatar animation data...');
    const avatarData = prepareAvatarData(llmResult, ttsResult);

    // Optional: Download audio locally
    let localAudioPath = null;
    if (!useFallback && downloadAudio && ttsResult.audioUrl) {
      localAudioPath = await typecastService.downloadAudio(ttsResult.audioUrl);
    }

    // Clean up temp file
    if (audioFile.tempFilePath && fs.existsSync(audioFile.tempFilePath)) {
      fs.unlinkSync(audioFile.tempFilePath);
    }

    console.log(`\n🎀 ═══════════════════════════════════════`);
    console.log(`🎀 Pipeline Complete! Megumin is ready to speak!`);
    console.log(`🎀 ═══════════════════════════════════════\n`);

    res.json({
      success: true,
      data: {
        // What user said
        userMessage: sttResult.text,
        
        // Megumin's response
        yukiResponse: {
          text: llmResult.text,
          mood: llmResult.mood
        },
        
        // Audio for playback (null if fallback needed)
        audio: useFallback ? null : {
          url: ttsResult.audioUrl,
          localPath: localAudioPath,
          duration: ttsResult.duration
        },
        
        // Avatar animation data
        avatar: avatarData,
        
        // Session info
        sessionId,
        useFallbackAudio: useFallback
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/speech/chat/text
 * Text-only chat: User types → Megumin responds with voice
 */
router.post('/chat/text', async (req, res, next) => {
  try {
    const { 
      message,
      sessionId = 'default',
      actorId,
      context = null
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n🎀 Text Chat: "${message}"`);

    // Generate Megumin's response
    const llmResult = await groqService.generateCharacterResponse(
      message,
      sessionId,
      { context }
    );

    // Generate voice (with fallback handling)
    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    let ttsResult;
    let useFallback = false;
    
    try {
      ttsResult = await typecastService.textToSpeech(llmResult.text, {
        actorId,
        emotion: typecastEmotion
      });
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, client will use fallback audio:', ttsError.message);
      // Create minimal result for lip-sync generation
      useFallback = true;
      const estimatedDuration = Math.max(llmResult.text.length * 80, 1000);
      ttsResult = {
        success: false,
        audioUrl: null,
        duration: estimatedDuration,
        lipSync: typecastService.generateLipSyncData(llmResult.text, estimatedDuration)
      };
    }

    // Prepare avatar data
    const avatarData = prepareAvatarData(llmResult, ttsResult);

    res.json({
      success: true,
      data: {
        userMessage: message,
        yukiResponse: {
          text: llmResult.text,
          mood: llmResult.mood
        },
        audio: useFallback ? null : {
          url: ttsResult.audioUrl,
          duration: ttsResult.duration
        },
        avatar: avatarData,
        sessionId,
        useFallbackAudio: useFallback
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/speech/process
 * Legacy full pipeline (without character response)
 */
router.post('/process', async (req, res, next) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioFile = req.files.audio;
    const { 
      language = 'en',
      actorId,
      emotion = 'normal',
      tempo = 1.0,
      downloadAudio = false
    } = req.body;

    console.log(`🔄 Starting full pipeline processing...`);

    // Step 1: Speech to Text
    const sttResult = await groqService.speechToText(audioFile.tempFilePath, {
      language
    });

    // Step 2: Text to Speech (direct, no LLM)
    const ttsResult = await typecastService.textToSpeech(sttResult.text, {
      actorId,
      emotion,
      tempo
    });

    // Step 3: Avatar data
    const avatarData = prepareAvatarData({ text: sttResult.text, mood: 'neutral' }, ttsResult);

    let localAudioPath = null;
    if (downloadAudio && ttsResult.audioUrl) {
      localAudioPath = await typecastService.downloadAudio(ttsResult.audioUrl);
    }

    if (audioFile.tempFilePath && fs.existsSync(audioFile.tempFilePath)) {
      fs.unlinkSync(audioFile.tempFilePath);
    }

    res.json({
      success: true,
      data: {
        transcription: sttResult,
        audio: {
          url: ttsResult.audioUrl,
          localPath: localAudioPath,
          duration: ttsResult.duration
        },
        avatar: avatarData,
        lipSync: ttsResult.lipSync
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/speech/voices
 * Get all available Typecast voices
 */
router.get('/voices', async (req, res, next) => {
  try {
    const { model } = req.query;
    const voices = await typecastService.getVoices(model || null);
    res.json({
      success: true,
      count: voices.length,
      data: voices.map(v => ({
        id: v.voice_id,
        name: v.voice_name,
        language: v.language,
        emotions: v.emotions,
        style: v.style
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/speech/voices/anime
 * Get anime-style voices
 */
router.get('/voices/anime', async (req, res, next) => {
  try {
    const voices = await typecastService.getAnimeVoices();
    res.json({
      success: true,
      count: voices.length,
      data: voices.map(v => ({
        id: v.voice_id,
        name: v.voice_name,
        language: v.language,
        emotions: v.emotions
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/speech/voices/search/:name
 * Search for a voice by name
 */
router.get('/voices/search/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const voice = await typecastService.findVoiceByName(name);
    
    if (!voice) {
      return res.status(404).json({
        success: false,
        error: `Voice "${name}" not found`
      });
    }

    res.json({
      success: true,
      data: {
        id: voice.voice_id,
        name: voice.voice_name,
        language: voice.language,
        emotions: voice.emotions,
        style: voice.style
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/speech/voices/miu
 * Find Miu Kobayashi voice specifically
 */
router.get('/voices/miu', async (req, res, next) => {
  try {
    const miu = await typecastService.findMiuKobayashi();
    
    res.json({
      success: true,
      message: 'Found Miu Kobayashi!',
      data: {
        id: miu.voice_id,
        name: miu.voice_name,
        language: miu.language,
        emotions: miu.emotions,
        style: miu.style
      },
      usage: `Set TYPECAST_ACTOR_ID=${miu.voice_id} in your .env file`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/speech/voices/:id
 * Get voice details by ID
 */
router.get('/voices/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const voice = await typecastService.getVoiceById(id);
    
    res.json({
      success: true,
      data: voice
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/speech/history/:sessionId
 * Clear conversation history for a session
 */
router.delete('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  groqService.clearHistory(sessionId);
  res.json({
    success: true,
    message: `Conversation history cleared for session: ${sessionId}`
  });
});

/**
 * POST /api/speech/meal-reaction
 * Special endpoint: Megumin reacts to a meal
 */
router.post('/meal-reaction', async (req, res, next) => {
  try {
    const { 
      mealDescription,
      isHealthy,
      calories,
      nutrients,
      sessionId = 'default',
      actorId
    } = req.body;

    if (!mealDescription) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    // Build context for Megumin
    const context = `The user is showing their meal: "${mealDescription}". 
    Health assessment: ${isHealthy ? 'This is a healthy choice!' : 'This could be healthier...'}
    ${calories ? `Calories: ~${calories}` : ''}
    ${nutrients ? `Key nutrients: ${nutrients}` : ''}`;

    // Generate Megumin's reaction
    const message = isHealthy 
      ? "Look at my meal! What do you think?"
      : "I'm about to eat this... don't judge me!";

    const llmResult = await groqService.generateCharacterResponse(
      message,
      sessionId,
      { context }
    );

    // Generate voice (with fallback handling)
    const typecastEmotion = mapMoodToEmotion(llmResult.mood);
    let ttsResult;
    let useFallback = false;
    
    try {
      ttsResult = await typecastService.textToSpeech(llmResult.text, {
        actorId,
        emotion: typecastEmotion
      });
    } catch (ttsError) {
      console.warn('⚠️ TTS failed, client will use fallback audio:', ttsError.message);
      useFallback = true;
      const estimatedDuration = Math.max(llmResult.text.length * 80, 1000);
      ttsResult = {
        success: false,
        audioUrl: null,
        duration: estimatedDuration,
        lipSync: typecastService.generateLipSyncData(llmResult.text, estimatedDuration)
      };
    }

    const avatarData = prepareAvatarData(llmResult, ttsResult);

    res.json({
      success: true,
      data: {
        meal: mealDescription,
        isHealthy,
        yukiResponse: {
          text: llmResult.text,
          mood: llmResult.mood
        },
        audio: useFallback ? null : {
          url: ttsResult.audioUrl,
          duration: ttsResult.duration
        },
        avatar: avatarData,
        sessionId,
        useFallbackAudio: useFallback
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

/**
 * Map Megumin's mood to Typecast emotion
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
    // Animation timeline
    timeline: {
      duration: ttsResult.duration || 0,
      fps: 60
    },
    
    // Character mood/expression
    expression: {
      type: mood,
      intensity: getExpressionIntensity(mood)
    },
    
    // Lip sync for mouth animation
    lipSync: {
      visemes: lipSync.visemes,
      mouthShapes: lipSync.mouthShapes
    },
    
    // Gesture suggestions
    gestures: generateGestureSuggestions(llmResult.text, mood),
    
    // Natural eye blinks
    eyeBlinks: generateEyeBlinkTimeline(ttsResult.duration || 0),
    
    // Head/body movement suggestions
    bodyMovement: generateBodyMovement(mood)
  };
}

/**
 * Get expression intensity based on mood
 */
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

/**
 * Generate gesture suggestions based on text and mood
 */
function generateGestureSuggestions(text, mood) {
  const gestures = [];
  const lowerText = (text || '').toLowerCase();
  
  // Mood-based gestures
  if (mood === 'excited' || mood === 'happy') {
    gestures.push({ type: 'bounce', time: 0, duration: 500 });
  }
  if (mood === 'pouty') {
    gestures.push({ type: 'puff_cheeks', time: 0, duration: 1000 });
  }
  if (mood === 'thinking') {
    gestures.push({ type: 'head_tilt', time: 0, duration: 800 });
  }
  if (mood === 'concerned') {
    gestures.push({ type: 'worried_look', time: 0, duration: 600 });
  }
  
  // Text-based gestures
  if (lowerText.includes('?')) {
    gestures.push({ type: 'head_tilt', time: 200, duration: 500 });
  }
  if (lowerText.includes('!')) {
    gestures.push({ type: 'emphasis', time: 0, duration: 400 });
  }
  if (lowerText.includes('great') || lowerText.includes('amazing') || lowerText.includes('sugoi')) {
    gestures.push({ type: 'clap', time: 0, duration: 800 });
  }
  if (lowerText.includes('no') || lowerText.includes('don\'t')) {
    gestures.push({ type: 'head_shake', time: 0, duration: 600 });
  }
  if (lowerText.includes('yes') || lowerText.includes('right')) {
    gestures.push({ type: 'nod', time: 0, duration: 500 });
  }
  
  return gestures;
}

/**
 * Generate natural eye blink timeline
 */
function generateEyeBlinkTimeline(durationMs) {
  const blinks = [];
  const avgBlinkInterval = 3500;
  let currentTime = 800;
  
  while (currentTime < durationMs) {
    blinks.push({
      time: currentTime,
      duration: 120
    });
    currentTime += avgBlinkInterval + (Math.random() - 0.5) * 2000;
  }
  
  return blinks;
}

/**
 * Generate body movement based on mood
 */
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

export default router;
