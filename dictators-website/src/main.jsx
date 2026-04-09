import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SimulatorPage from './pages/SimulatorPage.jsx'
import CubePage from './pages/CubePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/cube" element={<CubePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)