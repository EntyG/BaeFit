import { motion } from 'framer-motion';

const MOOD_CONFIG = {
  happy: {
    emoji: '😊',
    color: 'from-yellow-400 to-orange-400',
    label: 'Happy',
  },
  excited: {
    emoji: '🤩',
    color: 'from-pink-400 to-rose-400',
    label: 'Excited',
  },
  concerned: {
    emoji: '😟',
    color: 'from-blue-400 to-cyan-400',
    label: 'Concerned',
  },
  pouty: {
    emoji: '😤',
    color: 'from-orange-400 to-red-400',
    label: 'Pouty',
  },
  encouraging: {
    emoji: '💪',
    color: 'from-green-400 to-emerald-400',
    label: 'Encouraging',
  },
  thinking: {
    emoji: '🤔',
    color: 'from-purple-400 to-violet-400',
    label: 'Thinking',
  },
  surprised: {
    emoji: '😲',
    color: 'from-cyan-400 to-blue-400',
    label: 'Surprised',
  },
  sad: {
    emoji: '😢',
    color: 'from-blue-500 to-indigo-500',
    label: 'Sad',
  },
  angry: {
    emoji: '😠',
    color: 'from-red-500 to-orange-500',
    label: 'Angry',
  },
  neutral: {
    emoji: '😌',
    color: 'from-rose-400 to-pink-400',
    label: 'Neutral',
  },
};

const MoodIndicator = ({ mood = 'neutral', isSpeaking = false }) => {
  const config = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mood-indicator"
    >
      <motion.span
        animate={isSpeaking ? { scale: [1, 1.2, 1] } : { y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: isSpeaking ? 0.5 : 2 }}
        className="mood-emoji"
      >
        {config.emoji}
      </motion.span>
      <span className="mood-text">{config.label}</span>
      
      {isSpeaking && (
        <div className="speaking-indicator">
          <motion.div
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ repeat: Infinity, duration: 0.4, delay: 0 }}
            className="speaking-dot"
          />
          <motion.div
            animate={{ scaleY: [1, 2.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }}
            className="speaking-dot"
          />
          <motion.div
            animate={{ scaleY: [1, 1.8, 1] }}
            transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }}
            className="speaking-dot"
          />
        </div>
      )}
    </motion.div>
  );
};

export default MoodIndicator;

