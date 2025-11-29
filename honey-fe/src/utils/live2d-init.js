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

// Log configuration status
console.log('✅ Live2DModel initialized with PIXI Ticker');
console.log('📦 Waiting for Live2DCubismCore...');

export { PIXI, Live2DModel };
