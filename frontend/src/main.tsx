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
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'

const SimulatorPage = lazy(() => import('./pages/simulator/SimulatorPage.jsx'))
const LearnPage = lazy(() => import('./pages/LearnPage.jsx'))
const StepByStepPage = lazy(() => import('./pages/StepByStepPage.jsx'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))

export function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
