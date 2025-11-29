import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import Live2DCanvas from './components/Live2DCanvas';
import ChatInterface from './components/ChatInterface';
import FoodPanel from './components/FoodPanel';
import MoodIndicator from './components/MoodIndicator';
import { healthCheck, chatWithText } from './services/api';
import './App.css';

function App() {
  const [isModelReady, setIsModelReady] = useState(false);
  const [currentMood, setCurrentMood] = useState('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [dailyGoal] = useState(2000);
  
  const live2dRef = useRef(null);
  const audioRef = useRef(null);
  const chatRef = useRef(null);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setBackendStatus('connected');
      } catch {
        setBackendStatus('disconnected');
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Yuki's response (from chat or food reactions)
  const handleYukiResponse = useCallback((response) => {
    const { yukiResponse, audio, avatar } = response;

    // Update mood
    if (yukiResponse?.mood) {
      setCurrentMood(yukiResponse.mood);
      live2dRef.current?.setMood(yukiResponse.mood);
    }

    // Play audio with lip sync
    if (audio?.url && !isMuted) {
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Construct full audio URL
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const audioUrl = audio.url.startsWith('http') ? audio.url : `${API_BASE}${audio.url}`;
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;

      newAudio.onplay = () => {
        setIsSpeaking(true);
        if (avatar?.lipSync) {
          live2dRef.current?.startLipSync(avatar.lipSync);
        } else {
          live2dRef.current?.startSpeaking();
        }
      };

      newAudio.onended = () => {
        setIsSpeaking(false);
        live2dRef.current?.stopLipSync?.();
        live2dRef.current?.stopSpeaking?.();
        setTimeout(() => {
          live2dRef.current?.playMotion('idle');
        }, 500);
      };

      newAudio.onerror = () => {
        setIsSpeaking(false);
        live2dRef.current?.stopLipSync?.();
        live2dRef.current?.stopSpeaking?.();
      };

      newAudio.play().catch(console.error);
    }
  }, [isMuted]);

  // Handle food logging - Yuki reacts to food choices
  const handleFoodLog = useCallback(async (food) => {
    try {
      const message = food.healthy
        ? `I just added ${food.name} to my meal! What do you think?`
        : `I'm eating ${food.name}... please don't be too harsh!`;
      
      const response = await chatWithText(message, {
        sessionId,
        context: `User logged food: ${food.name} (${food.calories} kcal). Health rating: ${food.healthy ? 'healthy' : 'unhealthy'}`
      });

      if (response.success) {
        handleYukiResponse(response.data);
      }
    } catch (error) {
      console.error('Error getting Yuki reaction:', error);
    }
  }, [sessionId, handleYukiResponse]);

  // Handle asking Yuki about food
  const handleAskYuki = useCallback(async (question) => {
    try {
      const response = await chatWithText(question, { sessionId });
      if (response.success) {
        handleYukiResponse(response.data);
      }
    } catch (error) {
      console.error('Error asking Yuki:', error);
    }
  }, [sessionId, handleYukiResponse]);

  // Handle model ready
  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
  }, []);

  return (
    <div className="app-container">
      {/* Kitchen Background Image */}
      <div className="kitchen-background" />

      {/* Header */}
      <header className="app-header">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="logo-section"
        >
          <span className="logo-icon">🍯</span>
          <div className="logo-text">
            <h1>BaeFit</h1>
            <p>Your AI Nutrition Companion</p>
          </div>
        </motion.div>

        <div className="header-controls">
          {/* Backend Status */}
          <div className={`status-badge ${backendStatus === 'connected' ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {backendStatus === 'connected' ? 'Online' : 'Offline'}
          </div>

          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="icon-btn"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Day/Night Toggle */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="icon-btn"
            title={isNightMode ? 'Day Mode' : 'Night Mode'}
          >
            {isNightMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="icon-btn"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="main-layout">
        {/* Left Panel - Food Tracking */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="panel"
        >
          <FoodPanel
            onFoodLog={handleFoodLog}
            onAskYuki={handleAskYuki}
            dailyGoal={dailyGoal}
          />
        </motion.div>

        {/* Center - Avatar Area */}
        <div className="avatar-area">
          {/* Mood Indicator */}
          <AnimatePresence>
            {isModelReady && (
              <MoodIndicator mood={currentMood} isSpeaking={isSpeaking} />
            )}
          </AnimatePresence>

          {/* Loading State */}
          {!isModelReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-6xl mb-4"
              >
                🎀
              </motion.div>
              <p className="text-rose-300 animate-pulse text-lg font-medium drop-shadow-lg">Loading Yuki...</p>
            </motion.div>
          )}

          {/* Live2D Canvas - Full area */}
          <div className="absolute inset-0">
            <Live2DCanvas
              ref={live2dRef}
              mood={currentMood}
              isSpeaking={isSpeaking}
              onReady={handleModelReady}
            />
          </div>

          {/* Avatar Stage Glow */}
          <div className="avatar-stage" />
        </div>

        {/* Right Panel - Chat */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="panel"
        >
          <ChatInterface
            ref={chatRef}
            onYukiResponse={handleYukiResponse}
            sessionId={sessionId}
          />
        </motion.div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl border border-white/10 w-96 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings size={24} />
                Settings
              </h2>
              
              <div className="space-y-4">
                {/* Night Mode Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300 flex items-center gap-2">
                    {isNightMode ? <Moon size={18} /> : <Sun size={18} />}
                    Night Mode
                  </span>
                  <button
                    onClick={() => setIsNightMode(!isNightMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isNightMode ? 'bg-violet-600' : 'bg-gray-600'
                    }`}
                  >
                    <motion.div
                      animate={{ x: isNightMode ? 24 : 2 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300 flex items-center gap-2">
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    Sound
                  </span>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      !isMuted ? 'bg-emerald-600' : 'bg-gray-600'
                    }`}
                  >
                    <motion.div
                      animate={{ x: !isMuted ? 24 : 2 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Daily Calorie Goal */}
                <div className="p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300 text-sm">Daily Calorie Goal</span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      defaultValue={dailyGoal}
                      className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white"
                    />
                    <span className="text-gray-400 text-sm">kcal</span>
                  </div>
                </div>

                {/* Status Info */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    Backend: {backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Session: {sessionId.slice(0, 20)}...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
