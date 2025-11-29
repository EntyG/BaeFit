import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Wait for Cubism Core to load before rendering
function initApp() {
  if (typeof window.Live2DCubismCore !== 'undefined') {
    console.log('✅ Cubism Core detected, starting React app...');
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } else {
    console.warn('⚠️ Cubism Core not loaded yet, retrying...');
    setTimeout(initApp, 100);
  }
}

// Start initialization
initApp();
