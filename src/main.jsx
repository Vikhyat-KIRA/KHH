import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PharmacistPortal from './components/PharmacistPortal.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'

const path = window.location.pathname.toLowerCase();
const isAdminPortal = path.startsWith('/admin-portal') || path.startsWith('/admin-potal');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      {isAdminPortal ? <PharmacistPortal /> : <App />}
    </LanguageProvider>
  </StrictMode>,
)

