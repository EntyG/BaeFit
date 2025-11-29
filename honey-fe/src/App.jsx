import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sparkles, Heart, Moon, Sun } from 'lucide-react';
import Live2DCanvas from './components/Live2DCanvas';
import ChatInterface from './components/ChatInterface';
import MoodIndicator from './components/MoodIndicator';
import { healthCheck } from './services/api';
import './App.css';

function App() {
  const [isModelReady, setIsModelReady] = useState(false);
  const [currentMood, setCurrentMood] = useState('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sessionId] = useState(() => `session_${Date.now()}`);
  
  const live2dRef = useRef(null);
  const audioRef = useRef(null);

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

  // Handle Yuki's response
  const handleYukiResponse = useCallback((response) => {
    const { yukiResponse, audio, avatar } = response;

    // Update mood
    if (yukiResponse?.mood) {
      setCurrentMood(yukiResponse.mood);
      live2dRef.current?.setMood(yukiResponse.mood);
    }

    // Play audio with lip sync
    if (audio?.url) {
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const newAudio = new Audio(audio.url);
      audioRef.current = newAudio;

      newAudio.onplay = () => {
        setIsSpeaking(true);
        live2dRef.current?.startSpeaking();
      };

      newAudio.onended = () => {
        setIsSpeaking(false);
        live2dRef.current?.stopSpeaking();
        // Return to idle after speaking
        setTimeout(() => {
          live2dRef.current?.playMotion('idle');
        }, 500);
      };

      newAudio.onerror = () => {
        setIsSpeaking(false);
        live2dRef.current?.stopSpeaking();
      };

      newAudio.play().catch(console.error);
    }
  }, []);

  // Handle model ready
  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
  }, []);

  return (
    <div className={`min-h-screen ${isNightMode ? 'bg-night' : 'bg-day'} transition-all duration-1000`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Stars (night mode) */}
        {isNightMode && (
          <div className="stars-container">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="star"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                }}
              />
            ))}
          </div>
        )}

        {/* Floating particles */}
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className={`particle ${isNightMode ? 'particle-night' : 'particle-day'}`}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.sin(i) * 30, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 10 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                bottom: `-20px`,
              }}
            />
          ))}
        </div>

        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${
          isNightMode 
            ? 'bg-gradient-to-t from-purple-950/90 via-transparent to-indigo-950/50' 
            : 'bg-gradient-to-t from-rose-200/50 via-transparent to-sky-200/30'
        }`} />
      </div>

      {/* Living room frame */}
      <div className="living-room-frame">
        <div className={`window-frame ${isNightMode ? 'window-night' : 'window-day'}`} />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-3xl">🍯</span>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-300 to-pink-400 bg-clip-text text-transparent">
                BaeFit
              </h1>
              <p className="text-xs text-rose-300/70">Your healthy eating companion</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Backend status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
              backendStatus === 'connected' 
                ? 'bg-green-500/20 text-green-400' 
                : backendStatus === 'checking'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-400' : 
                backendStatus === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
              }`} />
              {backendStatus === 'connected' ? 'Online' : backendStatus === 'checking' ? 'Connecting...' : 'Offline'}
            </div>

            {/* Day/Night toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsNightMode(!isNightMode)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isNightMode ? <Moon className="text-yellow-300" size={20} /> : <Sun className="text-orange-400" size={20} />}
            </motion.button>

            {/* Settings */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings className="text-rose-300" size={20} />
            </motion.button>
          </div>
        </header>

        {/* Main area */}
        <main className="flex-1 flex items-stretch px-6 pb-6 gap-6">
          {/* Live2D Avatar Section */}
          <div className="flex-1 relative">
            {/* Mood indicator */}
            <AnimatePresence>
              {isModelReady && (
                <MoodIndicator mood={currentMood} isSpeaking={isSpeaking} />
              )}
            </AnimatePresence>

            {/* Avatar container with cozy frame */}
            <div className="h-full relative">
              <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-purple-500/10 rounded-3xl backdrop-blur-sm border border-rose-500/20" />
              
              {/* Loading state */}
              {!isModelReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="text-5xl mb-4"
                  >
                    🎀
                  </motion.div>
                  <p className="text-rose-300 animate-pulse">Loading Yuki...</p>
                </div>
              )}

              {/* Live2D Canvas */}
              <div className="absolute inset-0">
                <Live2DCanvas
                  ref={live2dRef}
                  mood={currentMood}
                  isSpeaking={isSpeaking}
                  onReady={handleModelReady}
                />
              </div>

              {/* Decorative elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-4 right-4"
              >
                <Heart className="text-rose-400/50" size={24} />
              </motion.div>

              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-16 right-4"
              >
                <Sparkles className="text-yellow-400/50" size={20} />
              </motion.div>
            </div>
          </div>

          {/* Chat Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="w-[400px] flex-shrink-0"
          >
            <ChatInterface
              onYukiResponse={handleYukiResponse}
              sessionId={sessionId}
            />
          </motion.div>
        </main>

        {/* Footer hint */}
        <footer className="text-center py-3 text-rose-300/50 text-xs">
          <p>Hold the 🎤 button to talk, or type a message</p>
        </footer>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-rose-950 to-purple-950 p-6 rounded-2xl border border-rose-500/30 w-96"
            >
              <h2 className="text-xl font-bold text-rose-200 mb-4">Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-rose-300">Night Mode</span>
                  <button
                    onClick={() => setIsNightMode(!isNightMode)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isNightMode ? 'bg-violet-600' : 'bg-rose-300'
                    }`}
                  >
                    <motion.div
                      animate={{ x: isNightMode ? 24 : 2 }}
                      className="w-5 h-5 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-rose-500/20">
                  <p className="text-rose-400/70 text-sm">
                    Backend: {backendStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
                  </p>
                  <p className="text-rose-400/70 text-sm mt-1">
                    Session: {sessionId.slice(0, 20)}...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-2 bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 rounded-lg transition-colors"
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
