import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
// Import from our initialization module to ensure proper setup
import { PIXI, Live2DModel } from '../utils/live2d-init';

// Motion mapping
const MOOD_TO_MOTION = {
  happy: 'motions/02_fun.motion3.json',
  excited: 'motions/I_fun_motion_01.motion3.json',
  concerned: 'motions/04_sad.motion3.json',
  pouty: 'motions/01_angry.motion3.json',
  encouraging: 'motions/02_fun.motion3.json',
  thinking: 'motions/00_nomal.motion3.json',
  surprised: 'motions/03_surprised.motion3.json',
  sad: 'motions/I_f_sad__motion_01.motion3.json',
  angry: 'motions/I_angry_motion_01.motion3.json',
  neutral: 'motions/00_nomal.motion3.json',
  sleep: 'motions/05_sleep.motion3.json',
  shy: 'motions/07_tere.motion3.json',
  idle: 'motions/I_idling_motion_01.motion3.json',
};

const Live2DCanvas = forwardRef(({ mood = 'neutral', isSpeaking = false, onReady }, ref) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const mouthIntervalRef = useRef(null);
  const lipSyncDataRef = useRef(null);
  const lipSyncStartTimeRef = useRef(0);
  const lipSyncRafRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  const applyMouthOpen = useCallback((value) => {
    try {
      if (!modelRef.current?.internalModel?.coreModel) return;

      const model = modelRef.current.internalModel.coreModel;
      const params = model.parameters || model._model?.parameters;

      if (params && params.ids && params.values) {
        const mouthParams = ['ParamMouthOpenY', 'PARAM_MOUTH_OPEN_Y', 'Param23'];
        for (const paramName of mouthParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = value;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Mouth animation error:', e);
    }
  }, []);

  const stopLipSync = useCallback(() => {
    if (lipSyncRafRef.current) {
      cancelAnimationFrame(lipSyncRafRef.current);
      lipSyncRafRef.current = null;
    }
    lipSyncDataRef.current = null;
    lipSyncStartTimeRef.current = 0;
    applyMouthOpen(0);
  }, [applyMouthOpen]);

  const startLipSync = useCallback((lipSync) => {
    if (!modelRef.current || !lipSync || !Array.isArray(lipSync.visemes)) {
      console.warn('Invalid lipSync data or model not ready');
      return;
    }

    lipSyncDataRef.current = lipSync;
    lipSyncStartTimeRef.current = performance.now();

    const loop = () => {
      if (!modelRef.current || !lipSyncDataRef.current) return;

      const { visemes, mouthShapes } = lipSyncDataRef.current;
      const elapsed = performance.now() - lipSyncStartTimeRef.current;

      let current = null;
      for (const v of visemes) {
        if (elapsed >= v.time && elapsed <= v.time + v.duration) {
          current = v;
          break;
        }
      }

      let mouthOpen = 0;
      if (current) {
        const shape = mouthShapes?.[current.viseme];
        const baseOpen = shape?.mouth_open ?? 0.6;
        const intensity = current.value ?? 1.0;
        mouthOpen = Math.max(0, Math.min(1, baseOpen * intensity));
      }

      applyMouthOpen(mouthOpen);
      lipSyncRafRef.current = requestAnimationFrame(loop);
    };

    if (lipSyncRafRef.current) {
      cancelAnimationFrame(lipSyncRafRef.current);
    }
    lipSyncRafRef.current = requestAnimationFrame(loop);
  }, [applyMouthOpen]);

  const startMouthAnimation = useCallback(() => {
    if (lipSyncDataRef.current) return;
    if (mouthIntervalRef.current || !modelRef.current) return;
    
    let value = 0;
    let direction = 1;
    
    mouthIntervalRef.current = setInterval(() => {
      if (!modelRef.current?.internalModel?.coreModel) return;
      
      value += direction * 0.15;
      if (value >= 1) direction = -1;
      if (value <= 0) direction = 1;
      
      applyMouthOpen(value);
    }, 50);
  }, [applyMouthOpen]);

  const stopMouthAnimation = useCallback(() => {
    if (mouthIntervalRef.current) {
      clearInterval(mouthIntervalRef.current);
      mouthIntervalRef.current = null;
    }
    applyMouthOpen(0);
  }, [applyMouthOpen]);

  useImperativeHandle(ref, () => ({
    playMotion: (motionName) => {
      if (modelRef.current) {
        const motionFile = MOOD_TO_MOTION[motionName] || motionName;
        try {
          modelRef.current.motion(motionFile);
        } catch (e) {
          console.warn('Motion error:', e);
        }
      }
    },
    setMood: (newMood) => {
      if (modelRef.current && MOOD_TO_MOTION[newMood]) {
        try {
          modelRef.current.motion(MOOD_TO_MOTION[newMood]);
        } catch (e) {
          console.warn('Mood error:', e);
        }
      }
    },
    startSpeaking: () => startMouthAnimation(),
    stopSpeaking: () => {
      stopMouthAnimation();
      stopLipSync();
    },
    startLipSync: (lipSync) => startLipSync(lipSync),
    stopLipSync: () => stopLipSync(),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let app = null;

    const init = async () => {
      try {
        setDebugInfo('Checking Cubism SDK...');
        
        // Wait for Cubism Core to be available
        let attempts = 0;
        while (typeof window.Live2DCubismCore === 'undefined' && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (typeof window.Live2DCubismCore === 'undefined') {
          throw new Error('Live2DCubismCore not loaded after waiting. Please refresh the page.');
        }
        
        // Ensure Live2DModel is configured
        Live2DModel.registerTicker(PIXI.Ticker);
        console.log('✅ Cubism Core ready, version:', window.Live2DCubismCore.Version?.());
        
        setDebugInfo('Creating PIXI app...');

        // PIXI Application initialization (constructor with options)
        // Disable event system to prevent PixiJS v7 interaction errors with pixi-live2d-display
        app = new PIXI.Application({
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          width: 800,
          height: 600,
        });
        
        // Disable events on the renderer to prevent interaction errors
        if (app.renderer && app.renderer.events) {
          // Disable the event system entirely
          app.renderer.events.autoPreventDefault = false;
        }

        if (!mounted) {
          app.destroy(true, { children: true });
          return;
        }

        // Append the WebGL canvas to our container
        const canvas = app.view;
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
          throw new Error('PIXI Application view is not a canvas element');
        }
        // Disable pointer events on canvas to prevent interaction system from processing them
        canvas.style.pointerEvents = 'none';
        containerRef.current.appendChild(canvas);
        appRef.current = app;
        
        setDebugInfo('Loading Live2D model...');
        console.log('🎮 PIXI v7 initialized, loading model...');

        // Load model
        // Disable internal autoInteract to avoid Pixi v7 interaction manager incompatibility,
        // we'll manage simple click interactions ourselves.
        const model = await Live2DModel.from('/live2d/yuki/c001_f_costume_kouma.model3.json', {
          autoInteract: false,
        });
        
        if (!mounted) return;
        modelRef.current = model;

        setDebugInfo('Setting up model...');
        console.log('📦 Model loaded, setting up...');
        
        // Setup model
        model.scale.set(0.25);
        model.anchor.set(0.5, 0.5);
        model.x = app.screen.width / 2;
        model.y = app.screen.height / 2 + 50;
        // Disable pointer interaction to avoid Pixi v7 interaction manager issues
        // with pixi-live2d-display; we focus on autonomous motions for now.
        model.eventMode = 'none'; // Explicitly disable events
        if (model.buttonMode !== undefined) {
          model.buttonMode = false;
        }

        // Disable events on stage as well
        app.stage.eventMode = 'none';
        app.stage.addChild(model);
        
        // Recursively disable events on all children to prevent isInteractive errors
        const disableEvents = (obj) => {
          if (obj && typeof obj === 'object') {
            if (obj.eventMode !== undefined) {
              obj.eventMode = 'none';
            }
            if (obj.children && Array.isArray(obj.children)) {
              obj.children.forEach(child => disableEvents(child));
            }
          }
        };
        disableEvents(model);

        // Play idle motion
        try {
          await model.motion('motions/I_idling_motion_01.motion3.json');
          console.log('🎭 Playing idle motion');
        } catch (e) {
          console.warn('Could not play initial motion:', e);
        }

        console.log('✅ Yuki loaded successfully!');
        setLoading(false);
        setError(null);
        setDebugInfo('');
        onReady?.();

        // Resize handler
        const handleResize = () => {
          if (app && model && containerRef.current) {
            const width = containerRef.current.clientWidth || 800;
            const height = containerRef.current.clientHeight || 600;
            app.renderer.resize(width, height);
            model.x = width / 2;
            model.y = height / 2 + 50;
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial resize

        // Cleanup resize listener
        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err) {
        console.error('❌ Live2D Error:', err);
        if (mounted) {
          setError(err.message || 'Failed to load Yuki');
          setLoading(false);
          setDebugInfo('');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      stopMouthAnimation();
      stopLipSync();
      if (app) {
        app.destroy(true, { children: true });
      }
    };
  }, [onReady, stopMouthAnimation, stopLipSync]);

  // Mood changes
  useEffect(() => {
    if (modelRef.current && MOOD_TO_MOTION[mood]) {
      console.log(`🎭 Changing mood to: ${mood}`);
      modelRef.current.motion(MOOD_TO_MOTION[mood]).catch(console.warn);
    }
  }, [mood]);

  // Speaking state
  useEffect(() => {
    if (isSpeaking) {
      console.log('🗣️ Yuki started speaking');
      startMouthAnimation();
    } else {
      console.log('🤐 Yuki stopped speaking');
      stopMouthAnimation();
      stopLipSync();
    }
  }, [isSpeaking, startMouthAnimation, stopMouthAnimation, stopLipSync]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-b from-rose-950/40 to-purple-950/40 backdrop-blur-sm rounded-2xl">
          <div className="text-5xl mb-4 animate-bounce">🎀</div>
          <p className="text-rose-300 animate-pulse text-lg">Loading Yuki...</p>
          {debugInfo && (
            <p className="text-rose-400/60 text-sm mt-2">{debugInfo}</p>
          )}
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-red-950/90 rounded-2xl p-6">
          <div className="text-4xl mb-4">😢</div>
          <p className="text-red-300 text-center mb-2 font-medium">Failed to Load Yuki</p>
          <p className="text-red-400/80 text-sm text-center max-w-md mb-4">{error}</p>
          <div className="mt-2 p-3 bg-black/30 rounded-lg text-left max-w-md">
            <p className="text-xs text-red-300/60 font-mono mb-2">Troubleshooting:</p>
            <p className="text-xs text-red-300/80 font-mono">• Open browser console (F12)</p>
            <p className="text-xs text-red-300/80 font-mono">• Check /public/live2d/yuki/ files</p>
            <p className="text-xs text-red-300/80 font-mono">• Verify Cubism SDK loaded</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}
    </div>
  );
});

Live2DCanvas.displayName = 'Live2DCanvas';

export default Live2DCanvas;
