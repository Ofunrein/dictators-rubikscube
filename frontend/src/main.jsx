/*
 * Main Entry Point — this is the very first JavaScript file that runs.
 *
 * When someone opens the app in their browser, the browser loads index.html,
 * which loads this file. From here, we:
 *   1. Set up React (the UI library that powers everything)
 *   2. Set up React Router (the library that handles page navigation without
 *      full page reloads — it makes the app feel like a native app)
 *   3. Define our routes:
 *      - "/"           -> shows the landing page (App.jsx)
 *      - "/simulator"  -> shows the interactive Rubik's Cube simulator
 *      - anything else -> redirects back to "/"
 *   4. Render everything into the <div id="root"> in index.html
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SimulatorPage from './pages/simulator/SimulatorPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/simulator/*" element={<SimulatorPage />} />
        <Route path="/page/simulator/*" element={<SimulatorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
