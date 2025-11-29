import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for TTS generation
});

/**
 * Chat with Yuki using voice input
 */
export async function chatWithVoice(audioBlob, options = {}) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', options.language || 'en');
  formData.append('sessionId', options.sessionId || 'default');
  
  if (options.actorId) {
    formData.append('actorId', options.actorId);
  }
  if (options.context) {
    formData.append('context', options.context);
  }

  const response = await api.post('/api/speech/chat', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Chat with Yuki using text input
 */
export async function chatWithText(message, options = {}) {
  const response = await api.post('/api/speech/chat/text', {
    message,
    sessionId: options.sessionId || 'default',
    actorId: options.actorId,
    context: options.context,
  });

  return response.data;
}

/**
 * Get Yuki's reaction to a meal
 */
export async function getMealReaction(mealDescription, isHealthy, options = {}) {
  const response = await api.post('/api/speech/meal-reaction', {
    mealDescription,
    isHealthy,
    calories: options.calories,
    nutrients: options.nutrients,
    sessionId: options.sessionId || 'default',
    actorId: options.actorId,
  });

  return response.data;
}

/**
 * Clear conversation history
 */
export async function clearHistory(sessionId = 'default') {
  const response = await api.delete(`/api/speech/history/${sessionId}`);
  return response.data;
}

/**
 * Health check
 */
export async function healthCheck() {
  const response = await api.get('/api/health');
  return response.data;
}

/**
 * Get available voices
 */
export async function getVoices() {
  const response = await api.get('/api/speech/voices');
  return response.data;
}

/**
 * WebSocket connection for real-time chat
 */
export class YukiWebSocket {
  constructor(onMessage, onError) {
    this.ws = null;
    this.onMessage = onMessage;
    this.onError = onError;
    this.sessionId = null;
  }

  connect() {
    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws/speech';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🔌 Connected to Yuki');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.sessionId) {
        this.sessionId = data.sessionId;
      }
      this.onMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onError?.(error);
    };

    this.ws.onclose = () => {
      console.log('🔌 Disconnected from Yuki');
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendTextChat(message, actorId) {
    this.send({
      type: 'chat_text',
      message,
      actorId,
    });
  }

  startRecording(language = 'en') {
    this.send({
      type: 'start_recording',
      language,
    });
  }

  stopRecording(actorId) {
    this.send({
      type: 'stop_recording',
      actorId,
      fullProcess: true,
    });
  }

  sendMealReaction(mealDescription, isHealthy, actorId) {
    this.send({
      type: 'meal_reaction',
      mealDescription,
      isHealthy,
      actorId,
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default api;

