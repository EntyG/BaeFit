import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
// Import from our initialization module to ensure proper setup
import { PIXI, Live2DModel } from '../utils/live2d-init';

// Motion mapping - Extended with all available emotions
const MOOD_TO_MOTION = {
  // Primary moods
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
  
  // Additional emotions from folder
  sleep: 'motions/05_sleep.motion3.json',
  sleepy: 'motions/05_sleep.motion3.json',
  shy: 'motions/07_tere.motion3.json',
  embarrassed: 'motions/07_tere.motion3.json',
  blush: 'motions/07_tere.motion3.json',
  idle: 'motions/I_idling_motion_01.motion3.json',
  normal: 'motions/00_nomal.motion3.json',
  fun: 'motions/02_fun.motion3.json',
  repeat: 'motions/I_repeat_motion_01.motion3.json',
  tojime: 'motions/06_tojime.motion3.json', // Closing eyes/bashful
};

const Live2DCanvas = forwardRef(({ mood = 'neutral', isSpeaking = false, onReady }, ref) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const mouthIntervalRef = useRef(null);
  const lipSyncDataRef = useRef(null);
  const lipSyncStartTimeRef = useRef(0);
  const lipSyncRafRef = useRef(null);
  const eyeTrackingRafRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Smooth tracking state
  const targetEyePosRef = useRef({ x: 0, y: 0 });
  const currentEyePosRef = useRef({ x: 0, y: 0 });
  const targetHeadPosRef = useRef({ x: 0, y: 0 });
  const currentHeadPosRef = useRef({ x: 0, y: 0 });
  const targetBodyPosRef = useRef({ x: 0, y: 0 });
  const currentBodyPosRef = useRef({ x: 0, y: 0 });
  const targetClothPosRef = useRef({ x: 0, y: 0 });
  const currentClothPosRef = useRef({ x: 0, y: 0 });
  const trackingRafRef = useRef(null);
  const idleAnimationRafRef = useRef(null);

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

  const updateTrackingTargets = useCallback((cursorX, cursorY) => {
    try {
      // Get canvas bounds for relative positioning
      const canvas = appRef.current?.view;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate relative position (-1 to 1 range)
      const relativeX = Math.max(-1, Math.min(1, (cursorX - centerX) / (rect.width / 2)));
      const relativeY = Math.max(-1, Math.min(1, (cursorY - centerY) / (rect.height / 2)));

      // Set target positions for smooth interpolation
      targetEyePosRef.current = {
        x: relativeX * 0.8, // Increased eye intensity for stronger gaze
        y: -relativeY * 0.5  // Increased intensity and invert Y
      };

      targetHeadPosRef.current = {
        x: relativeX * 25, // Increased head rotation for more dramatic movement
        y: -relativeY * 18  // Increased head rotation, inverted Y
      };

      targetBodyPosRef.current = {
        x: relativeX * 15, // Increased body lean for more visible movement
        y: -relativeY * 12  // Increased body lean, inverted Y
      };

      targetClothPosRef.current = {
        x: relativeX * 0.3, // Subtle cloth movement
        y: -relativeY * 0.2  // Cloth responds to movement
      };

      // Start smooth tracking if not already running
      if (!trackingRafRef.current) {
        startSmoothTracking();
      }
    } catch (e) {
      console.warn('Tracking target update error:', e);
    }
  }, []);

  const startSmoothTracking = useCallback(() => {
    const lerp = (current, target, factor) => {
      return current + (target - current) * factor;
    };

    const updateTracking = () => {
      try {
        if (!modelRef.current?.internalModel?.coreModel) {
          trackingRafRef.current = null;
          return;
        }

        const model = modelRef.current.internalModel.coreModel;
        const params = model.parameters || model._model?.parameters;

        if (!params || !params.ids || !params.values) {
          trackingRafRef.current = null;
          return;
        }

        // Smoothly interpolate eye positions (more responsive)
        currentEyePosRef.current.x = lerp(currentEyePosRef.current.x, targetEyePosRef.current.x, 0.15);
        currentEyePosRef.current.y = lerp(currentEyePosRef.current.y, targetEyePosRef.current.y, 0.15);

        // Smoothly interpolate head positions (more responsive but still smooth)
        currentHeadPosRef.current.x = lerp(currentHeadPosRef.current.x, targetHeadPosRef.current.x, 0.08);
        currentHeadPosRef.current.y = lerp(currentHeadPosRef.current.y, targetHeadPosRef.current.y, 0.08);

        // Smoothly interpolate body positions (more responsive for natural movement)
        currentBodyPosRef.current.x = lerp(currentBodyPosRef.current.x, targetBodyPosRef.current.x, 0.08);
        currentBodyPosRef.current.y = lerp(currentBodyPosRef.current.y, targetBodyPosRef.current.y, 0.08);

        // Smoothly interpolate cloth positions (more subtle and physics-like)
        currentClothPosRef.current.x = lerp(currentClothPosRef.current.x, targetClothPosRef.current.x, 0.05);
        currentClothPosRef.current.y = lerp(currentClothPosRef.current.y, targetClothPosRef.current.y, 0.05);

        // Apply eye tracking parameters
        const eyeXParams = ['ParamEyeBallX', 'PARAM_EYE_BALL_X', 'ParamEyeBallX'];
        const eyeYParams = ['ParamEyeBallY', 'PARAM_EYE_BALL_Y', 'ParamEyeBallY'];

        for (const paramName of eyeXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentEyePosRef.current.x;
            break;
          }
        }

        for (const paramName of eyeYParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentEyePosRef.current.y;
            break;
          }
        }

        // Apply head tracking parameters
        const headXParams = ['ParamAngleX', 'PARAM_ANGLE_X', 'ParamHeadAngleX'];
        const headYParams = ['ParamAngleY', 'PARAM_ANGLE_Y', 'ParamHeadAngleY'];

        for (const paramName of headXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentHeadPosRef.current.x;
            break;
          }
        }

        for (const paramName of headYParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentHeadPosRef.current.y;
            break;
          }
        }

        // Apply body tracking parameters
        const bodyXParams = ['ParamBodyAngleX', 'PARAM_BODY_ANGLE_X', 'ParamBodyX'];
        const bodyYParams = ['ParamBodyAngleY', 'PARAM_BODY_ANGLE_Y', 'ParamBodyY'];

        for (const paramName of bodyXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentBodyPosRef.current.x;
            break;
          }
        }

        for (const paramName of bodyYParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentBodyPosRef.current.y;
            break;
          }
        }

        // Apply cloth physics parameters
        const clothXParams = ['ParamCloth1', 'PARAM_CLOTH_1', 'ParamPhysics1', 'ParamClothX'];
        const clothYParams = ['ParamCloth2', 'PARAM_CLOTH_2', 'ParamPhysics2', 'ParamClothY'];

        for (const paramName of clothXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentClothPosRef.current.x;
            break;
          }
        }

        for (const paramName of clothYParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = currentClothPosRef.current.y;
            break;
          }
        }

        // Add natural breathing animation
        const breathTime = performance.now() * 0.001; // Convert to seconds
        const breathValue = Math.sin(breathTime * 2) * 0.1; // Subtle breathing

        const breathParams = ['ParamBreath', 'PARAM_BREATH'];
        for (const paramName of breathParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = breathValue;
            break;
          }
        }

        // Add subtle arm/pose movements
        const armParams = ['ParamArmL', 'PARAM_ARM_L', 'ParamPose'];
        const armValue = Math.sin(breathTime * 0.5) * 0.05; // Very subtle arm movement

        for (const paramName of armParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = armValue;
            break;
          }
        }

        // Continue animation
        trackingRafRef.current = requestAnimationFrame(updateTracking);

        // Stop if we've reached the target (within threshold)
        const eyeThreshold = 0.005;
        const headThreshold = 0.2;
        const bodyThreshold = 0.1;
        const clothThreshold = 0.01;
        const eyeReached = Math.abs(currentEyePosRef.current.x - targetEyePosRef.current.x) < eyeThreshold &&
                          Math.abs(currentEyePosRef.current.y - targetEyePosRef.current.y) < eyeThreshold;
        const headReached = Math.abs(currentHeadPosRef.current.x - targetHeadPosRef.current.x) < headThreshold &&
                           Math.abs(currentHeadPosRef.current.y - targetHeadPosRef.current.y) < headThreshold;
        const bodyReached = Math.abs(currentBodyPosRef.current.x - targetBodyPosRef.current.x) < bodyThreshold &&
                           Math.abs(currentBodyPosRef.current.y - targetBodyPosRef.current.y) < bodyThreshold;
        const clothReached = Math.abs(currentClothPosRef.current.x - targetClothPosRef.current.x) < clothThreshold &&
                            Math.abs(currentClothPosRef.current.y - targetClothPosRef.current.y) < clothThreshold;

        if (eyeReached && headReached && bodyReached && clothReached) {
          trackingRafRef.current = null;
        }
      } catch (e) {
        console.warn('Smooth tracking error:', e);
        trackingRafRef.current = null;
      }
    };

    trackingRafRef.current = requestAnimationFrame(updateTracking);
  }, []);

  const startIdleAnimation = useCallback(() => {
    const animateIdle = () => {
      try {
        if (!modelRef.current?.internalModel?.coreModel) {
          idleAnimationRafRef.current = null;
          return;
        }

        const model = modelRef.current.internalModel.coreModel;
        const params = model.parameters || model._model?.parameters;

        if (!params || !params.ids || !params.values) {
          idleAnimationRafRef.current = null;
          return;
        }

        const time = performance.now() * 0.001; // Convert to seconds

        // Very subtle idle body sway
        const swayValue = Math.sin(time * 0.3) * 2; // Slow, subtle movement

        // Apply subtle idle movements to body
        const bodyXParams = ['ParamBodyAngleX', 'PARAM_BODY_ANGLE_X', 'ParamBodyX'];
        for (const paramName of bodyXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1 && Math.abs(params.values[idx]) < 5) { // Only if not actively tracking
            params.values[idx] = swayValue;
            break;
          }
        }

        // Add subtle idle cloth movement
        const clothSwayX = Math.sin(time * 0.4) * 0.1; // Very subtle cloth sway
        const clothSwayY = Math.sin(time * 0.6) * 0.05; // Even subtler vertical movement

        const clothXParams = ['ParamCloth1', 'PARAM_CLOTH_1', 'ParamPhysics1', 'ParamClothX'];
        const clothYParams = ['ParamCloth2', 'PARAM_CLOTH_2', 'ParamPhysics2', 'ParamClothY'];

        for (const paramName of clothXParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1 && Math.abs(params.values[idx]) < 0.2) { // Only if not actively tracking
            params.values[idx] = clothSwayX;
            break;
          }
        }

        for (const paramName of clothYParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1 && Math.abs(params.values[idx]) < 0.1) { // Only if not actively tracking
            params.values[idx] = clothSwayY;
            break;
          }
        }

        // Subtle breathing
        const breathValue = Math.sin(time * 1.5) * 0.15 + 0.1; // Breathing pattern

        const breathParams = ['ParamBreath', 'PARAM_BREATH'];
        for (const paramName of breathParams) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = breathValue;
            break;
          }
        }

        idleAnimationRafRef.current = requestAnimationFrame(animateIdle);
      } catch (e) {
        console.warn('Idle animation error:', e);
        idleAnimationRafRef.current = null;
      }
    };

    idleAnimationRafRef.current = requestAnimationFrame(animateIdle);
  }, []);

  const applyEyeTracking = useCallback((cursorX, cursorY) => {
    updateTrackingTargets(cursorX, cursorY);
  }, [updateTrackingTargets]);

  const handleCursorMove = useCallback((clientX, clientY) => {
    setCursorPos({ x: clientX, y: clientY });
    updateTrackingTargets(clientX, clientY);
  }, [updateTrackingTargets]);

  const startEyeTracking = useCallback(() => {
    const handleMouseMove = (e) => {
      handleCursorMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleCursorMove(touch.clientX, touch.clientY);
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Store cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleCursorMove]);

  const resetGazePosition = useCallback(() => {
    // Reset targets to center
    targetEyePosRef.current = { x: 0, y: 0 };
    targetHeadPosRef.current = { x: 0, y: 0 };
    targetBodyPosRef.current = { x: 0, y: 0 };
    targetClothPosRef.current = { x: 0, y: 0 };

    // Stop any ongoing smooth tracking
    if (trackingRafRef.current) {
      cancelAnimationFrame(trackingRafRef.current);
      trackingRafRef.current = null;
    }

    try {
      if (!modelRef.current?.internalModel?.coreModel) return;

      const model = modelRef.current.internalModel.coreModel;
      const params = model.parameters || model._model?.parameters;

      if (!params || !params.ids || !params.values) return;

      // Reset eye positions to center
      const eyeXParams = ['ParamEyeBallX', 'PARAM_EYE_BALL_X', 'ParamEyeBallX'];
      const eyeYParams = ['ParamEyeBallY', 'PARAM_EYE_BALL_Y', 'ParamEyeBallY'];

      for (const paramName of eyeXParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      for (const paramName of eyeYParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      // Reset head positions to center
      const headXParams = ['ParamAngleX', 'PARAM_ANGLE_X', 'ParamHeadAngleX'];
      const headYParams = ['ParamAngleY', 'PARAM_ANGLE_Y', 'ParamHeadAngleY'];

      for (const paramName of headXParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      for (const paramName of headYParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      // Reset body positions to center
      const bodyXParams = ['ParamBodyAngleX', 'PARAM_BODY_ANGLE_X', 'ParamBodyX'];
      const bodyYParams = ['ParamBodyAngleY', 'PARAM_BODY_ANGLE_Y', 'ParamBodyY'];

      for (const paramName of bodyXParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      for (const paramName of bodyYParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      // Reset cloth positions to center
      const clothXParams = ['ParamCloth1', 'PARAM_CLOTH_1', 'ParamPhysics1', 'ParamClothX'];
      const clothYParams = ['ParamCloth2', 'PARAM_CLOTH_2', 'ParamPhysics2', 'ParamClothY'];

      for (const paramName of clothXParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      for (const paramName of clothYParams) {
        const idx = params.ids.indexOf(paramName);
        if (idx !== -1) {
          params.values[idx] = 0;
          break;
        }
      }

      // Reset current positions
      currentEyePosRef.current = { x: 0, y: 0 };
      currentHeadPosRef.current = { x: 0, y: 0 };
      currentBodyPosRef.current = { x: 0, y: 0 };
      currentClothPosRef.current = { x: 0, y: 0 };
    } catch (e) {
      console.warn('Gaze reset error:', e);
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
    startEyeTracking: () => startEyeTracking(),
    stopEyeTracking: () => {
      resetGazePosition();
      if (eyeTrackingRafRef.current) {
        cancelAnimationFrame(eyeTrackingRafRef.current);
        eyeTrackingRafRef.current = null;
      }
      if (trackingRafRef.current) {
        cancelAnimationFrame(trackingRafRef.current);
        trackingRafRef.current = null;
      }
    },
    startIdleAnimation: () => startIdleAnimation(),
    stopIdleAnimation: () => {
      if (idleAnimationRafRef.current) {
        cancelAnimationFrame(idleAnimationRafRef.current);
        idleAnimationRafRef.current = null;
      }
    },
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
        
        // Setup model - Smaller scale for better fit
        model.scale.set(0.23);  // Reduced from 0.25 to 0.2
        model.anchor.set(0.5, 0.5);
        model.x = app.screen.width / 2;
        model.y = app.screen.height / 2 + 150;
        // Disable pointer interaction to avoid Pixi v7 interaction manager issues
        // with pixi-live2d-display; we focus on autonomous motions for now.
        model.eventMode = 'none';
        model.interactiveChildren = false;
        // Ensure isInteractive exists for Pixi v7 EventBoundary hit-testing
        if (typeof model.isInteractive !== 'function') {
          model.isInteractive = () => false;
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

        console.log('✅ Megumin loaded successfully!');
        setLoading(false);
        setError(null);
        setDebugInfo('');
        onReady?.();

        // Start idle animation for natural movement
        startIdleAnimation();

        // Start eye tracking
        const cleanupEyeTracking = startEyeTracking();

        // Resize handler
        const handleResize = () => {
          if (app && model && containerRef.current) {
            const width = containerRef.current.clientWidth || 800;
            const height = containerRef.current.clientHeight || 600;
            app.renderer.resize(width, height);
            model.x = width / 2;
            model.y = height / 2 + 150;
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial resize

        // Cleanup resize listener and eye tracking
        return () => {
          window.removeEventListener('resize', handleResize);
          cleanupEyeTracking?.();
        };

      } catch (err) {
        console.error('❌ Live2D Error:', err);
        if (mounted) {
          setError(err.message || 'Failed to load Megumin');
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
      resetGazePosition();
      if (trackingRafRef.current) {
        cancelAnimationFrame(trackingRafRef.current);
        trackingRafRef.current = null;
      }
      if (idleAnimationRafRef.current) {
        cancelAnimationFrame(idleAnimationRafRef.current);
        idleAnimationRafRef.current = null;
      }
      if (app) {
        app.destroy(true, { children: true });
      }
    };
  }, [onReady, stopMouthAnimation, stopLipSync]);

  // Mood changes - Play motion AND adjust facial expressions
  useEffect(() => {
    if (modelRef.current && MOOD_TO_MOTION[mood]) {
      console.log(`🎭 Changing mood to: ${mood}`);
      
      // Play the motion animation
      modelRef.current.motion(MOOD_TO_MOTION[mood]).catch(console.warn);
      
      // Also apply facial expression parameters based on mood
      applyMoodExpression(mood);
    }
  }, [mood]);

  // Apply facial expression parameters for different moods
  const applyMoodExpression = useCallback((currentMood) => {
    try {
      if (!modelRef.current?.internalModel?.coreModel) return;

      const model = modelRef.current.internalModel.coreModel;
      const params = model.parameters || model._model?.parameters;
      
      if (!params || !params.ids || !params.values) return;

      // Helper to set parameter value
      const setParam = (paramNames, value) => {
        for (const paramName of paramNames) {
          const idx = params.ids.indexOf(paramName);
          if (idx !== -1) {
            params.values[idx] = value;
            break;
          }
        }
      };

      // Reset to neutral first
      setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 1);
      setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 1);
      setParam(['ParamBrowLY', 'PARAM_BROW_L_Y'], 0);
      setParam(['ParamBrowRY', 'PARAM_BROW_R_Y'], 0);

      // Apply mood-specific expressions
      switch (currentMood) {
        case 'happy':
        case 'excited':
        case 'fun':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 0.8);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 0.8);
          setParam(['ParamBrowLY', 'PARAM_BROW_L_Y'], 0.5);
          setParam(['ParamBrowRY', 'PARAM_BROW_R_Y'], 0.5);
          break;
        
        case 'surprised':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 1.2);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 1.2);
          setParam(['ParamBrowLY', 'PARAM_BROW_L_Y'], 1);
          setParam(['ParamBrowRY', 'PARAM_BROW_R_Y'], 1);
          break;
        
        case 'sad':
        case 'concerned':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 0.6);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 0.6);
          setParam(['ParamBrowLY', 'PARAM_BROW_L_Y'], -0.5);
          setParam(['ParamBrowRY', 'PARAM_BROW_R_Y'], -0.5);
          break;
        
        case 'angry':
        case 'pouty':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 0.5);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 0.5);
          setParam(['ParamBrowLY', 'PARAM_BROW_L_Y'], -0.8);
          setParam(['ParamBrowRY', 'PARAM_BROW_R_Y'], -0.8);
          break;
        
        case 'shy':
        case 'embarrassed':
        case 'blush':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 0.7);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 0.7);
          break;
        
        case 'sleepy':
        case 'sleep':
          setParam(['ParamEyeLOpen', 'PARAM_EYE_L_OPEN'], 0.3);
          setParam(['ParamEyeROpen', 'PARAM_EYE_R_OPEN'], 0.3);
          break;
        
        default:
          // neutral, thinking, encouraging, etc.
          break;
      }
    } catch (e) {
      console.warn('Expression animation error:', e);
    }
  }, []);

  // Speaking state
  useEffect(() => {
    if (isSpeaking) {
      console.log('🗣️ Megumin started speaking');
      startMouthAnimation();
    } else {
      console.log('🤐 Megumin stopped speaking');
      stopMouthAnimation();
      stopLipSync();
    }
  }, [isSpeaking, startMouthAnimation, stopMouthAnimation, stopLipSync]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-b from-rose-950/40 to-purple-950/40 backdrop-blur-sm rounded-2xl">
          <div className="text-5xl mb-4 animate-bounce">🎀</div>
          <p className="text-rose-300 animate-pulse text-lg">Loading Megumin...</p>
          {debugInfo && (
            <p className="text-rose-400/60 text-sm mt-2">{debugInfo}</p>
          )}
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-red-950/90 rounded-2xl p-6">
          <div className="text-4xl mb-4">😢</div>
          <p className="text-red-300 text-center mb-2 font-medium">Failed to Load Megumin</p>
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
