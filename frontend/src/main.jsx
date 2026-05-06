/*
 * main.jsx — App entry point
 *
 * Sets up the two global contexts that every page in the app shares:
 *   ThemeProvider — dark/light mode state, persisted to localStorage
 *   AuthProvider  — login/logout state and current user data
 *
 * Route map:
 *   /                  → App.jsx (landing page)
 *   /simulator         → SimulatorPage.jsx (interactive 3D cube)
 *   /page/simulator    → same, kept for legacy URL compatibility
 *   /learn             → LearnPage.jsx (learning modules and notation guide)
 *   /leaderboard       → LeaderboardPage.jsx (Supabase-backed global rankings)
 *   /profile           → ProfilePage.jsx (authenticated user stats)
 *   *                  → redirect to /
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import SimulatorPage from './pages/simulator/SimulatorPage.jsx'
import LearnPage from './pages/LearnPage.jsx'
import StepByStepPage from './pages/StepByStepPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/simulator/*" element={<SimulatorPage />} />
              <Route path="/page/simulator/*" element={<SimulatorPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/step-by-step" element={<StepByStepPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
