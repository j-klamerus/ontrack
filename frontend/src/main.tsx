import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './LogInToAppBridge.tsx'
import './styles/DarkTheme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
