import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Trash2, Volume2, VolumeX } from 'lucide-react';
import { chatWithVoice, chatWithText } from '../services/api';

const ChatInterface = ({ onYukiResponse, sessionId, actorId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle recording (instead of hold)
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processVoiceInput(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Please allow microphone access to use voice chat.');
      }
    }
  };

  // Process voice input
  const processVoiceInput = async (audioBlob) => {
    setIsProcessing(true);
    setProcessingStage('Listening...');

    try {
      setProcessingStage('Megumin is thinking...');
      
      const response = await chatWithVoice(audioBlob, {
        sessionId,
        actorId,
      });

      if (response.success) {
        const { userMessage, yukiResponse, audio } = response.data;

        // Add user message
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'user',
          text: userMessage,
        }]);

        // Add Megumin's response
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'yuki',
          text: yukiResponse.text,
          mood: yukiResponse.mood,
        }]);

        // Play audio and notify parent
        onYukiResponse?.(response.data);
        
        if (!isMuted && audio?.url) {
          playAudio(audio.url);
        }
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: 'Sorry, I had trouble understanding. Please try again!',
      }]);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const message = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setProcessingStage('Megumin is thinking...');

    // Add user message immediately
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      text: message,
    }]);

    try {
      const response = await chatWithText(message, {
        sessionId,
        actorId,
      });

      if (response.success) {
        const { yukiResponse, audio } = response.data;

        // Add Megumin's response
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'yuki',
          text: yukiResponse.text,
          mood: yukiResponse.mood,
        }]);

        // Play audio and notify parent
        onYukiResponse?.(response.data);
        
        if (!isMuted && audio?.url) {
          playAudio(audio.url);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'error',
        text: 'Connection error. Is the backend running?',
      }]);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // Play audio
  const playAudio = (url) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    
    // Construct full audio URL (backend returns relative path like /audio/xxx.mp3)
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const audioUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audio.play().catch(console.error);
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-rose-950/40 to-purple-950/40 backdrop-blur-md rounded-2xl border border-rose-500/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-rose-950/50 border-b border-rose-500/20">
        <h2 className="text-rose-200 font-medium text-lg flex items-center gap-2">
          <span className="text-xl">💬</span>
          Chat with Megumin
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-colors ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
            title="Clear chat"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin scrollbar-thumb-rose-500/30">
        {messages.length === 0 && (
          <div className="text-center text-rose-300/60 py-8">
            <p className="text-4xl mb-2">🎀</p>
            <p>Say hello to Megumin!</p>
            <p className="text-lg mt-1">Use voice or text to chat</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-violet-600/80 text-white rounded-br-sm'
                    : msg.type === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-rose-500/20 text-rose-100 rounded-bl-sm border border-rose-500/30'
                }`}
              >
                {msg.type === 'yuki' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-medium text-rose-300">Megumin</span>
                    {msg.mood && (
                      <span className="text-base px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200">
                        {msg.mood}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-lg leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-rose-500/20 text-rose-200 px-4 py-2 rounded-2xl rounded-bl-sm border border-rose-500/30">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-lg">{processingStage}</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-5 bg-rose-950/50 border-t border-rose-500/20">
        <div className="flex items-center gap-3">
          {/* Voice button - Toggle mode */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`p-4 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse'
                : 'bg-rose-500/30 text-rose-200 hover:bg-rose-500/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </motion.button>

          {/* Text input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            disabled={isProcessing || isRecording}
            className="flex-1 px-4 py-3 rounded-xl bg-rose-900/30 border border-rose-500/30 text-rose-100 placeholder-rose-400/50 focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
          />

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendTextMessage}
            disabled={!inputText.trim() || isProcessing || isRecording}
            className="p-4 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </motion.button>
        </div>

        {/* Recording hint */}
        {isRecording && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-red-400 text-lg mt-2"
          >
            🎤 Recording... Click to stop
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

