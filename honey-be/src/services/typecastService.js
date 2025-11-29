/**
 * Typecast.ai TTS Service - Direct API (No SDK required)
 * Documentation: https://typecast.ai/docs/quickstart
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TYPECAST_API_BASE = 'https://api.typecast.ai/v1';

class TypecastService {
  constructor() {
    this.apiKey = null;
    this.voiceCache = null;
    this.miuKobayashiId = null;
  }

  /**
   * Initialize with API key
   */
  init() {
    if (!process.env.TYPECAST_API_KEY) {
      throw new Error('TYPECAST_API_KEY is not configured');
    }
    this.apiKey = process.env.TYPECAST_API_KEY;
    return this;
  }

  /**
   * Make API request to Typecast
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.apiKey) this.init();

    const url = `${TYPECAST_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response;
  }

  /**
   * Get all available voices
   * @param {string} model - Optional model filter (e.g., "ssfm-v21")
   * @returns {Promise<Array>} List of available voices
   */
  async getVoices(model = null) {
    try {
      console.log('🎤 Fetching available voices from Typecast...');
      
      let url = '/voices';
      if (model) {
        url += `?model=${encodeURIComponent(model)}`;
      }

      const response = await this.apiRequest(url, { method: 'GET' });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get voices: ${response.status} - ${error}`);
      }

      const voices = await response.json();
      this.voiceCache = voices;
      
      console.log(`✅ Found ${voices.length} voices`);
      return voices;
    } catch (error) {
      console.error('❌ Get Voices Error:', error);
      throw error;
    }
  }

  /**
   * Get voice by ID
   * @param {string} voiceId - Voice ID
   * @returns {Promise<object>} Voice information
   */
  async getVoiceById(voiceId) {
    const voices = this.voiceCache || await this.getVoices();
    const voice = voices.find(v => v.voice_id === voiceId);
    
    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }
    
    return voice;
  }

  /**
   * Search for a voice by name
   * @param {string} name - Voice name to search for
   * @returns {Promise<object|null>} Voice object or null
   */
  async findVoiceByName(name) {
    try {
      const voices = this.voiceCache || await this.getVoices();
      
      // Exact match first
      let voice = voices.find(v => 
        v.voice_name?.toLowerCase() === name.toLowerCase()
      );
      
      // Partial match
      if (!voice) {
        voice = voices.find(v => 
          v.voice_name?.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (voice) {
        console.log(`🎀 Found voice: ${voice.voice_name} (ID: ${voice.voice_id})`);
        console.log(`   Emotions: ${voice.emotions?.join(', ') || 'default'}`);
      }

      return voice || null;
    } catch (error) {
      console.error('❌ Find Voice Error:', error);
      throw error;
    }
  }

  /**
   * Find Miu Kobayashi voice
   */
  async findMiuKobayashi() {
    if (this.miuKobayashiId) {
      return this.getVoiceById(this.miuKobayashiId);
    }

    const searchTerms = ['Miu Kobayashi', 'Miu', 'Kobayashi'];
    
    for (const term of searchTerms) {
      const voice = await this.findVoiceByName(term);
      if (voice) {
        this.miuKobayashiId = voice.voice_id;
        return voice;
      }
    }

    throw new Error('Miu Kobayashi voice not found. Use getVoices() to list all available voices.');
  }

  /**
   * Get anime/Japanese style voices
   */
  async getAnimeVoices() {
    const voices = await this.getVoices();
    
    const animeVoices = voices.filter(v => {
      const name = (v.voice_name || '').toLowerCase();
      return name.includes('miu') || name.includes('yuki') || 
             name.includes('sakura') || name.includes('hana') ||
             name.includes('aki') || name.includes('mei');
    });

    return animeVoices.length > 0 ? animeVoices : voices.slice(0, 20);
  }

  /**
   * Convert text to speech
   * Direct API call as per documentation
   * 
   * @param {string} text - Text to convert
   * @param {object} options - TTS options
   * @returns {Promise<object>} Audio URL and data
   */
  async textToSpeech(text, options = {}) {
    if (!this.apiKey) this.init();

    let {
      actorId = process.env.TYPECAST_ACTOR_ID,
      emotion = 'normal',
      model = 'ssfm-v21'
    } = options;

    // If no actorId, try to find one
    if (!actorId) {
      try {
        const miu = await this.findMiuKobayashi();
        actorId = miu.voice_id;
      } catch {
        // Fallback to Olivia (from docs example)
        actorId = 'tc_62a8975e695ad26f7fb514d1';
        console.log(`⚠️ Using fallback voice: Olivia (${actorId})`);
      }
    }

    console.log(`🗣️ Generating TTS...`);
    console.log(`   Voice: ${actorId}`);
    console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   Emotion: ${emotion}`);

    try {
      // Map mood to Typecast preset
      const presetMap = {
        'normal': 'normal',
        'happy': 'happy',
        'excited': 'happy',
        'sad': 'sad',
        'concerned': 'sad',
        'angry': 'angry',
        'pouty': 'angry',
        'neutral': 'normal'
      };

      const preset = presetMap[emotion] || 'normal';
      const intensity = emotion === 'excited' ? 2.0 : 1.0;

      // API request payload (from documentation)
      const payload = {
        text,
        model,
        voice_id: actorId,
        prompt: {
          preset: preset,
          preset_intensity: intensity
        }
      };

      const response = await fetch(`${TYPECAST_API_BASE}/text-to-speech`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Typecast API error: ${response.status} - ${errorText}`);
      }

      // API returns audio data directly as arrayBuffer
      const audioData = await response.arrayBuffer();

      // Determine file extension from Content-Type header so the browser
      // can correctly decode the audio (avoids NotSupportedError).
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const extension = this.getExtensionFromContentType(contentType);

      // Save audio to local file with appropriate extension
      const audioUrl = await this.saveAudio(Buffer.from(audioData), 'public/audio', extension);
      
      // Estimate duration (~80ms per character for speech)
      const estimatedDuration = Math.max(text.length * 80, 1000);

      console.log('✅ TTS complete!');

      return {
        success: true,
        audioUrl,
        duration: estimatedDuration,
        lipSync: this.generateLipSyncData(text, estimatedDuration),
        voiceId: actorId
      };

    } catch (error) {
      console.error('❌ Typecast TTS Error:', error);
      throw new Error(`Text-to-Speech failed: ${error.message}`);
    }
  }

  /**
   * Save audio buffer to file
   */
  async saveAudio(buffer, outputDir = 'public/audio', extension = 'wav') {
    const safeExt = extension.startsWith('.') ? extension.slice(1) : extension;
    const filename = `${uuidv4()}.${safeExt}`;
    const filepath = path.join(outputDir, filename);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(filepath, buffer);
    
    // Return URL path (will be served by Express static)
    return `/audio/${filename}`;
  }

  /**
   * Map Content-Type header to file extension
   */
  getExtensionFromContentType(contentType) {
    const ct = contentType.split(';')[0].trim().toLowerCase();
    const map = {
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/wave': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm'
    };
    return map[ct] || 'mp3';
  }

  /**
   * Generate lip sync data based on text
   */
  generateLipSyncData(text, durationMs) {
    const visemes = [];
    const chars = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const charDuration = durationMs / Math.max(chars.length, 1);
    
    let currentTime = 0;
    
    for (const char of chars) {
      const viseme = this.charToViseme(char);
      visemes.push({
        time: Math.round(currentTime),
        duration: Math.round(charDuration * 0.8),
        viseme,
        value: 0.8
      });
      currentTime += charDuration;
    }

    return {
      visemes,
      mouthShapes: this.getVisemeMappings()
    };
  }

  /**
   * Map character to viseme
   */
  charToViseme(char) {
    const map = {
      'a': 'AA', 'e': 'E', 'i': 'I', 'o': 'O', 'u': 'U',
      'p': 'PP', 'b': 'PP', 'm': 'PP',
      'f': 'FF', 'v': 'FF',
      't': 'DD', 'd': 'DD', 'n': 'nn', 'l': 'nn',
      's': 'SS', 'z': 'SS',
      'k': 'kk', 'g': 'kk',
      'r': 'RR', 'w': 'U', 'y': 'I', 'h': 'AA'
    };
    return map[char] || 'silence';
  }

  /**
   * Viseme to mouth shape mappings
   */
  getVisemeMappings() {
    return {
      'silence': { mouth_open: 0, mouth_form: 0 },
      'PP': { mouth_open: 0.1, mouth_form: 0.8 },
      'FF': { mouth_open: 0.2, mouth_form: 0.6 },
      'DD': { mouth_open: 0.4, mouth_form: 0.3 },
      'kk': { mouth_open: 0.5, mouth_form: 0.2 },
      'SS': { mouth_open: 0.3, mouth_form: 0.3 },
      'nn': { mouth_open: 0.3, mouth_form: 0.4 },
      'RR': { mouth_open: 0.4, mouth_form: 0.3 },
      'AA': { mouth_open: 0.9, mouth_form: 0.5 },
      'E': { mouth_open: 0.6, mouth_form: 0.6 },
      'I': { mouth_open: 0.4, mouth_form: 0.8 },
      'O': { mouth_open: 0.7, mouth_form: 0.3 },
      'U': { mouth_open: 0.5, mouth_form: 0.2 }
    };
  }
}

export default new TypecastService();
