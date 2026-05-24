/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'

const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'))

const path = window.location.pathname.toLowerCase();
const isAdminPortal = path.startsWith('/admin-portal') || path.startsWith('/admin-potal');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000, 
          style: { 
            background: '#0F172A', 
            color: '#FFFFFF', 
            border: '1px solid #1E293B', 
            fontSize: '12px',
            borderRadius: '10px',
            fontFamily: 'sans-serif'
          } 
        }} 
      />
      <Suspense fallback={
        <div className="min-h-screen bg-[#060B19] text-white flex flex-col items-center justify-center font-sans">
          <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Portal...</p>
        </div>
      }>
        {isAdminPortal ? <AdminDashboard /> : <App />}
      </Suspense>
    </LanguageProvider>
  </StrictMode>,
)

