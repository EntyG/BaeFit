/**
 * Live2D initialization module
 * This MUST be imported before any Live2DModel usage
 *
 * NOTE:
 * - We are using Cubism 3/4 (.moc3/.model3.json) models
 * - For these, pixi-live2d-display requires the Cubism 4 adapter import
 *   (`pixi-live2d-display/cubism4`) instead of the default Cubism 2 adapter
 *   (`pixi-live2d-display`), which expects `live2d.min.js` and will throw
 *   "Could not find Cubism 2 runtime" if used.
 */
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

// Make PIXI globally available (required by pixi-live2d-display)
if (typeof window !== 'undefined') {
  window.PIXI = PIXI;
}

// Register the Ticker for animations
Live2DModel.registerTicker(PIXI.Ticker);

// Monkey-patch interaction methods to prevent Pixi v7 incompatibility errors
// pixi-live2d-display tries to use renderer.plugins.interaction which is deprecated in v7
if (Live2DModel.prototype) {
  const noop = () => {};
  Live2DModel.prototype.registerInteraction = noop;
  Live2DModel.prototype.unregisterInteraction = noop;
}

// Patch EventBoundary to handle missing isInteractive method
// This fixes the "isInteractive is not a function" error in PixiJS v7
// The issue occurs when pixi-live2d-display creates objects that don't properly extend PixiJS v7 display objects
if (typeof window !== 'undefined') {
  // Try to patch EventBoundary if it exists
  const EventBoundary = PIXI.EventBoundary || (PIXI.events && PIXI.events.EventBoundary);
  if (EventBoundary && EventBoundary.prototype) {
    const originalHitTestMoveRecursive = EventBoundary.prototype.hitTestMoveRecursive;
    if (originalHitTestMoveRecursive) {
      EventBoundary.prototype.hitTestMoveRecursive = function(currentTarget, location, testFn, result) {
        // Safety check: ensure currentTarget has isInteractive method
        if (currentTarget) {
          if (typeof currentTarget.isInteractive !== 'function') {
            // Add a safe fallback for objects missing isInteractive
            try {
              Object.defineProperty(currentTarget, 'isInteractive', {
                get: function() {
                  // Return false for non-interactive objects
                  return this.eventMode !== undefined && this.eventMode !== 'none';
                },
                configurable: true,
                enumerable: false
              });
            } catch (e) {
              // If we can't define the property, return early to avoid the error
              return result;
            }
          }
          // Call original method with safe currentTarget
          try {
            return originalHitTestMoveRecursive.call(this, currentTarget, location, testFn, result);
          } catch (e) {
            // If the original method fails, return the result to prevent crash
            console.warn('EventBoundary.hitTestMoveRecursive error:', e);
            return result;
          }
        }
        return result;
      };
      console.log('✅ Patched EventBoundary.hitTestMoveRecursive for PixiJS v7 compatibility');
    }
  }
}

// Log configuration status
console.log('✅ Live2DModel initialized with PIXI Ticker');
console.log('📦 Waiting for Live2DCubismCore...');

export { PIXI, Live2DModel };
