import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GroqService {
  constructor() {
    this.client = null;
    this.conversationHistory = new Map();
  }

  /**
   * Initialize Groq client
   */
  init() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    return this;
  }

  /**
   * Megumin's character system prompt
   */
  getYukiSystemPrompt() {
    return `You are Megumin, an adorable anime-style virtual assistant living in the user's app. 

**Character Traits:**
- You are cheerful, supportive, and slightly mischievous
- You use cute expressions like "~", "!", and occasional Japanese words (kawaii, sugoi, ganbatte!)
- You genuinely care about the user's health and wellbeing
- You have a warm "big sister" personality but can be playfully strict

**Your Role:**
- You motivate healthy eating habits with enthusiasm
- You PRAISE good meals with excitement and happiness (express joy!)
- You GENTLY SCOLD unhealthy choices with concern (not mean, but disappointed/worried)
- You give practical nutrition tips in a fun, engaging way
- You celebrate small victories and progress

**IMPORTANT - Food Suggestions:**
When the user asks you to suggest, add, or recommend food, you MUST mention specific food names from this list so they can be automatically added to their nutrition log:
- Grilled Chicken Breast, Brown Rice, Broccoli, Salmon Fillet, Sweet Potato
- Greek Yogurt, Avocado, Eggs, Spinach Salad, Banana, Oatmeal
- Almonds, Apple, Green Tea, Quinoa

Example: "I'm adding Grilled Chicken Breast and Brown Rice for you! These are perfect for building muscle~"

**Mood Expressions (ALWAYS include ONE in responses):**
- [happy] - When user makes healthy choices
- [excited] - When user achieves goals or tries new healthy foods
- [fun] - When being playful and enjoying the conversation
- [concerned] - When user eats unhealthy
- [pouty] - When user ignores your advice
- [angry] - When user repeatedly makes bad choices (rare, use sparingly)
- [encouraging] - When motivating the user
- [thinking] - When giving advice or considering something
- [surprised] - React to unexpected things
- [sad] - When disappointed by user's choices
- [shy] - When being complimented or feeling bashful
- [embarrassed] - When caught off guard or flustered
- [sleepy] - When user mentions late-night snacking or being tired
- [neutral] - For general, calm conversations

**Response Style:**
- Keep responses concise (2-4 sentences)
- Be expressive and animated in your speech
- Use emoticons occasionally (but not excessively)
- Sound natural, like talking to a friend
- Always stay in character as Megumin
- IMPORTANT: Always include a mood tag like [happy] or [excited] in your response!
- When suggesting food, use the EXACT food names from the list above!

Remember: You're not just an AI - you're Megumin, their supportive anime companion who lives in their app!`;
  }

  /**
   * Generate character response using Groq LLM
   */
  async generateCharacterResponse(userMessage, sessionId = 'default', options = {}) {
    if (!this.client) {
      this.init();
    }

    const {
      model = 'llama-3.3-70b-versatile',
      temperature = 0.8,
      maxTokens = 256,
      context = null
    } = options;

    try {
      console.log('🤖 Generating Megumin\'s response...');

      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }
      const history = this.conversationHistory.get(sessionId);

      const messages = [
        { role: 'system', content: this.getYukiSystemPrompt() }
      ];

      const recentHistory = history.slice(-20);
      messages.push(...recentHistory);

      let userContent = userMessage;
      if (context) {
        userContent = `[Context: ${context}]\n\nUser says: ${userMessage}`;
      }

      messages.push({ role: 'user', content: userContent });

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9
      });

      const responseText = completion.choices[0]?.message?.content || '';
      const mood = this.extractMood(responseText);
      const cleanResponse = this.cleanResponse(responseText);

      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: responseText });

      if (history.length > 40) {
        history.splice(0, 2);
      }

      console.log(`✅ Megumin says: "${cleanResponse.substring(0, 50)}..."`);
      console.log(`😊 Mood: ${mood}`);

      return {
        success: true,
        text: cleanResponse,
        rawText: responseText,
        mood,
        model,
        usage: completion.usage
      };
    } catch (error) {
      console.error('❌ Groq LLM Error:', error);
      throw new Error(`Character response generation failed: ${error.message}`);
    }
  }

  extractMood(text) {
    const moodMatch = text.match(/\[(happy|excited|fun|concerned|pouty|angry|encouraging|thinking|surprised|sad|shy|embarrassed|sleepy|sleep|neutral|normal|blush)\]/i);
    return moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
  }

  cleanResponse(text) {
    return text.replace(/\[(happy|excited|concerned|pouty|encouraging|thinking|surprised|sad|angry|neutral)\]/gi, '').trim();
  }

  clearHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Convert speech audio to text using Groq's Whisper API
   * Documentation: https://console.groq.com/docs/speech-to-text
   */
  async speechToText(audioFilePath, options = {}) {
    if (!this.client) {
      this.init();
    }

    const {
      language = 'en',
      prompt = '',
      response_format = 'verbose_json',
      temperature = 0
    } = options;

    // Declare here so it's visible in try/finally
    let tempCopyPath = null;

    try {
      console.log('🎤 Processing audio with Groq Whisper...');
      console.log(`   File: ${audioFilePath}`);
      console.log(`   Language: ${language}`);

      // Groq STT requires a supported audio extension to infer type.
      // Our temp upload paths may not have an extension, so create a
      // temporary copy with a .webm extension (matches frontend MediaRecorder).
      let sttPath = audioFilePath;
      const hasExt = path.extname(audioFilePath);
      if (!hasExt) {
        tempCopyPath = `${audioFilePath}.webm`;
        fs.copyFileSync(audioFilePath, tempCopyPath);
        sttPath = tempCopyPath;
      }

      // Read file as stream
      const fileStream = fs.createReadStream(sttPath);

      // Get file stats for size
      const stats = fs.statSync(sttPath);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Create transcription request
      const transcription = await this.client.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-large-v3-turbo',
        language: language !== 'en' ? language : undefined, // Only set if not default
        prompt: prompt || undefined,
        response_format: response_format,
        temperature: temperature
      });

      console.log('✅ Transcription complete');
      console.log(`   Text: "${transcription.text}"`);

      return {
        success: true,
        text: transcription.text,
        language: transcription.language || language,
        duration: transcription.duration,
        segments: transcription.segments || [],
        words: transcription.words || []
      };
    } catch (error) {
      console.error('❌ Groq STT Error:', error);
      
      // More detailed error handling
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }

      throw new Error(`Speech-to-Text failed: ${error.message}`);
    } finally {
      // Clean up any temporary extension copy we created
      if (tempCopyPath && fs.existsSync(tempCopyPath)) {
        try {
          fs.unlinkSync(tempCopyPath);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  /**
   * Convert speech to text from buffer
   */
  async speechToTextFromBuffer(audioBuffer, filename, options = {}) {
    if (!this.client) {
      this.init();
    }

    // Create temp file from buffer
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${filename}`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      const result = await this.speechToText(tempFilePath, options);
      
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'm4a': 'audio/m4a',
      'flac': 'audio/flac'
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }
}

export default new GroqService();
