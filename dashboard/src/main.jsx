import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'

const isPrivacyPolicyRoute = window.location.pathname === '/privacy-policy'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPrivacyPolicyRoute ? (
      <PrivacyPolicy />
    ) : (
      <LanguageProvider>
        <App />
      </LanguageProvider>
    )}
  </StrictMode>,
)
