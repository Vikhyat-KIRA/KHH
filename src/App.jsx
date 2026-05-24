import { useState, useEffect } from 'react';
import { 
  Building, 
  PhoneCall, 
  Mail, 
  Clock, 
  Activity, 
  Users, 
  Star, 
  ShieldCheck, 
  ArrowUpRight, 
  CalendarDays, 
  Briefcase,
  Menu,
  X,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'framer-motion';
import BookingCalendar from './components/BookingCalendar';
import BulkForm from './components/BulkForm';
import MyBookings from './components/MyBookings';
import RetailForm from './components/RetailForm';
import { useLanguage } from './context/LanguageContext';


export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showLanguageSelect, setShowLanguageSelect] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('preferred_language');
    }
    return true;
  });
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/$/, "");
      if (path === '/admin-panel' || path.endsWith('/admin-panel')) {
        return 'admin';
      } else if (path === '/bookings' || path.endsWith('/bookings')) {
        return 'bookings';
      } else if (path === '/track-order' || path.endsWith('/track-order')) {
        return 'track-order';
      }
    }
    return 'main';
  });

  // Listen to browser forward/back buttons and sync activeView
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const getCleanPath = () => {
        return window.location.pathname.replace(/\/$/, "");
      };

      const handlePopState = () => {
        const p = getCleanPath();
        if (p === '/admin-panel' || p.endsWith('/admin-panel')) {
          setActiveView('admin');
        } else if (p === '/bookings' || p.endsWith('/bookings')) {
          setActiveView('bookings');
        } else if (p === '/track-order' || p.endsWith('/track-order')) {
          setActiveView('track-order');
        } else {
          setActiveView('main');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Synchronize activeView state to URL bar dynamically using HTML5 History API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/\/$/, "");
      if (activeView === 'admin' && currentPath !== '/admin-panel') {
        window.history.pushState({}, '', '/admin-panel');
      } else if (activeView === 'bookings' && currentPath !== '/bookings') {
        window.history.pushState({}, '', '/bookings');
      } else if (activeView === 'track-order' && currentPath !== '/track-order') {
        window.history.pushState({}, '', '/track-order');
      } else if (activeView === 'main' && currentPath !== '') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [activeView]);

  // Cinematic Intro Loader unmounting logic
  useEffect(() => {
    const introTimer = setTimeout(() => {
      setShowIntro(false);
    }, 3000); // unmount loader exactly when CSS animation exits
    return () => clearTimeout(introTimer);
  }, []);

  // Dynamic SEO Page Title & Description based on Active View
  useEffect(() => {
    try {
      if (activeView === 'bookings') {
        document.title = t('seo.bookingsTitle');
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', t('seo.bookingsDesc'));
        }
      } else if (activeView === 'track-order') {
        document.title = language === 'en' ? 'Track Remedies Order - Kanchan Homoeo Hall' : 'दवा ऑर्डर ट्रैक करें - कंचन होम्योपैथी हॉल';
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', language === 'en' ? 'Track status of your remedies order.' : 'अपने होम्योपैथिक दवा वितरण ऑर्डर की स्थिति ट्रैक करें।');
        }
      } else {
        document.title = t('seo.mainTitle');
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', t('seo.mainDesc'));
        }
      }
    } catch (e) {
      console.error("SEO update error", e);
    }
  }, [activeView, language, t]);

  // Dynamic Open Status Badge logic — Mon–Sat, 10:30 AM to 8:00 PM IST (Ranchi Time)
  useEffect(() => {
    const checkStatus = () => {
      // 🚨 Check manual override setting from pharmacist admin portal first!
      const override = localStorage.getItem('clinic_open_override');
      if (override === 'open') {
        setIsOpenNow(true);
        return;
      } else if (override === 'closed') {
        setIsOpenNow(false);
        return;
      }

      try {
        const now = new Date();
        
        // Extract hour and minute components in Asia/Kolkata (IST) timezone
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });
        const timeParts = timeFormatter.formatToParts(now);
        let hour = 12;
        let minute = 0;
        timeParts.forEach(p => {
          if (p.type === 'hour') hour = parseInt(p.value, 10);
          if (p.type === 'minute') minute = parseInt(p.value, 10);
        });

        // Extract weekday in Asia/Kolkata timezone ("Sun", "Mon", etc.)
        const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short'
        });
        const weekdayStr = weekdayFormatter.format(now);
        const isSunday = weekdayStr === 'Sun';

        const decimalTime = hour + minute / 60;

        // Sunday: always closed
        // Mon–Sat: 10:30 AM (10.5) to 8:00 PM (20.0)
        if (isSunday) {
          setIsOpenNow(false);
        } else {
          setIsOpenNow(decimalTime >= 10.5 && decimalTime < 20.0);
        }
      } catch {
        // Fallback to local system time in case browser environment doesn't support Intl
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const mins = now.getMinutes();
        const decimalTime = hour + mins / 60;
        if (day === 0) {
          setIsOpenNow(false);
        } else {
          setIsOpenNow(decimalTime >= 10.5 && decimalTime < 20.0);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);

    // Listen for manual open status override updates
    const handleOverrideUpdate = () => {
      checkStatus();
    };
    window.addEventListener('clinic-override-updated', handleOverrideUpdate);
    window.addEventListener('storage', handleOverrideUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('clinic-override-updated', handleOverrideUpdate);
      window.removeEventListener('storage', handleOverrideUpdate);
    };
  }, []);

  const smoothScroll = (e, id) => {
    e.preventDefault();
    setActiveView('main');
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, activeView === 'bookings' ? 100 : 0);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E293B] selection:bg-[#115E59]/20 selection:text-[#115E59] font-sans relative z-0">
      
      {/* Cinematic Logo Intro Loader Overlay */}
      {showIntro && (
        <div className="intro-overlay">
          <img 
            src="/logo.png" 
            alt="Kanchan Homoeo Hall Logo" 
            className="intro-logo" 
          />
        </div>
      )}

      {/* Premium Language Selection Overlay */}
      {!showIntro && showLanguageSelect && (
        <div className="language-overlay animate-fade-in">
          {/* Background Blurs */}
          <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-[#115E59]/5 blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-[#0F766E]/5 blur-[100px] pointer-events-none"></div>
          
          <div className="language-card glassmorphism max-w-md w-full mx-6 p-8 rounded-3xl relative overflow-hidden transition-all text-center">
            {/* Gold Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-neon"></div>
            
            {/* Logo in selector card */}
            <div className="w-16 h-16 rounded-2xl bg-[#115E59] flex items-center justify-center text-white mx-auto shadow-lg mb-6">
              <Activity className="w-9 h-9" />
            </div>
            
            <h2 className="font-display font-extrabold text-2xl tracking-tight text-[#1A2421] mb-2 uppercase">
              KANCHAN <span className="text-[#0F766E]">HOMOEO HALL</span>
            </h2>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-[#5A6561] mb-6">
              Holistic Healing &amp; Natural Remedies
            </p>
            
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#EAE5DC] to-transparent my-6"></div>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
              Choose Your Language / भाषा का चयन करें
            </p>
            
            <div className="flex flex-col gap-4">
              {/* English button */}
              <button
                onClick={() => {
                  setLanguage('en');
                  setShowLanguageSelect(false);
                }}
                className="w-full py-4 px-6 bg-white border-2 border-[#EAE5DC] text-[#1E293B] font-extrabold text-sm rounded-xl shadow-sm hover:border-[#115E59] hover:bg-[#115E59]/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-black text-slate-800 group-hover:text-[#115E59]">English</span>
                  <span className="text-4xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">Explore Site in English</span>
                </span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[#115E59]/10 group-hover:text-[#115E59] flex items-center justify-center font-bold text-2xs transition-all">EN</span>
              </button>
              
              {/* Hindi button */}
              <button
                onClick={() => {
                  setLanguage('hi');
                  setShowLanguageSelect(false);
                }}
                className="w-full py-4 px-6 bg-white border-2 border-[#EAE5DC] text-[#1E293B] font-extrabold text-sm rounded-xl shadow-sm hover:border-[#115E59] hover:bg-[#115E59]/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-black text-slate-800 group-hover:text-[#115E59]">हिन्दी (Hindi)</span>
                  <span className="text-4xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">वेबसाइट हिन्दी में देखें</span>
                </span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[#115E59]/10 group-hover:text-[#115E59] flex items-center justify-center font-bold text-2xs transition-all">HI</span>
              </button>
            </div>
            
            <div className="mt-8 text-4xs font-bold text-[#64748B] leading-relaxed uppercase tracking-wider">
              <div>Your Wellness, Our Heritage</div>
              <div className="text-slate-400 mt-1">आपका स्वास्थ्य, हमारी धरोहर</div>
            </div>
          </div>
        </div>
      )}

      {/* Background Watermark */}
      <div className="bg-watermark"></div>
      
      {/* 1. PREMIUM HEADER / NAVIGATION BAR */}
      {activeView !== 'admin' && (
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-[#EAE5DC] transition-all duration-300 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#115E59] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0">
              <Activity className="w-5.5 h-5.5" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-display font-extrabold text-xl tracking-tight text-[#1A2421] group-hover:text-[#115E59] transition-colors block whitespace-nowrap leading-none">
                KANCHAN<span className="text-[#0F766E]"> HOMOEO HALL</span>
              </span>
              <span className="hidden sm:block text-4xs font-bold uppercase tracking-widest text-[#5A6561] mt-1 whitespace-nowrap leading-none">
                Holistic Healing &amp; Homoeopathic Remedies — Ranchi
              </span>
              <span className="block sm:hidden text-[8px] font-bold uppercase tracking-widest text-[#5A6561] mt-1 whitespace-nowrap leading-none">
                Homoeopathy — Ranchi
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-4 text-[13px] font-semibold tracking-wide">
            <button
              onClick={() => {
                setActiveView('main');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'main' ? 'text-[#115E59]' : 'text-[#5A6561] hover:text-[#115E59]'
              }`}
            >
              {t('nav.home')}
            </button>
            <a href="#about" onClick={(e) => smoothScroll(e, 'about')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">{t('nav.about')}</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">{t('nav.owner')}</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">{t('nav.appointments')}</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">{t('nav.buyRemedies')}</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-[#5A6561] hover:text-[#0F766E] transition-colors">{t('nav.wholesale')}</a>
            <button
              onClick={() => {
                setActiveView('bookings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'bookings' ? 'text-[#115E59]' : 'text-[#5A6561] hover:text-[#115E59]'
              }`}
            >
              {t('nav.myBookings')}
            </button>
            <button
              onClick={() => {
                setActiveView('track-order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'track-order' ? 'text-[#115E59]' : 'text-[#5A6561] hover:text-[#115E59]'
              }`}
            >
              {t('nav.trackOrder')}
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">{t('nav.location')}</a>
            
            {/* Sleek inline language switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE5DC] hover:border-[#115E59] text-xs font-bold text-[#115E59] bg-[#F9F6F0]/50 hover:bg-[#115E59]/5 transition-all cursor-pointer shadow-sm select-none"
              title="Switch Language / भाषा बदलें"
            >
              🌐 {language === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </nav>

          {/* Quick CTA */}
          <div className="hidden xl:flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase transition-colors ${
              isOpenNow 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse' 
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              {isOpenNow ? t('nav.openNow') : t('nav.closedOnline')}
            </span>
            <a 
              href="tel:9431360455"
              className="py-2 px-4.5 bg-[#115E59] text-white font-bold text-xs rounded-lg shadow-md hover:bg-[#0D4F4A] hover:shadow-lg active:scale-95 transition-all uppercase tracking-wider"
            >
              {t('nav.callNow')}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-[#5A6561] hover:text-[#115E59] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-[#EAE5DC] p-6 flex flex-col gap-5 animate-fade-in shadow-md shadow-[#EFEAE2]">
            <button
              onClick={() => {
                setActiveView('main');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left text-base font-bold cursor-pointer bg-transparent border-0 p-0 ${
                activeView === 'main' ? 'text-[#115E59]' : 'text-[#1A2421]'
              }`}
            >
              {t('nav.home')}
            </button>
            <a href="#about" onClick={(e) => smoothScroll(e, 'about')} className="text-base font-semibold text-[#1A2421]">{t('nav.about')}</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-base font-semibold text-[#1A2421]">{t('nav.owner')}</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-base font-semibold text-[#1A2421]">{t('nav.appointments')}</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-base font-semibold text-[#1A2421]">{t('nav.buyRemedies')}</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-base font-semibold text-[#1A2421]">{t('nav.wholesale')}</a>
            <button
              onClick={() => {
                setActiveView('bookings');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left text-base font-semibold cursor-pointer bg-transparent border-0 p-0 ${
                activeView === 'bookings' ? 'text-[#115E59]' : 'text-[#1A2421]'
              }`}
            >
              {t('nav.myBookings')}
            </button>
            <button
              onClick={() => {
                setActiveView('track-order');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left text-base font-semibold cursor-pointer bg-transparent border-0 p-0 ${
                activeView === 'track-order' ? 'text-[#115E59]' : 'text-[#1A2421]'
              }`}
            >
              {t('nav.trackOrder')}
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-base font-semibold text-[#1A2421]">{t('nav.location')}</a>
            
            <div className="border-t border-[#EAE5DC] pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6561] font-bold tracking-wider uppercase">{t('nav.clinicStatus')}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase ${
                  isOpenNow 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {isOpenNow ? t('nav.openNow') : t('nav.closedOnline')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-[#5A6561] font-bold tracking-wider uppercase">Language / भाषा:</span>
                <button
                  onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EAE5DC] text-xs font-bold text-[#115E59] bg-[#F9F6F0]/50 hover:bg-[#115E59]/5 transition-all cursor-pointer shadow-sm"
                >
                  🌐 {language === 'en' ? 'हिन्दी' : 'English'}
                </button>
              </div>
              <a 
                href="tel:9431360455"
                className="w-full text-center py-3 bg-[#115E59] text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-[#0D4F4A]"
              >
                {t('nav.callNow')} — 9431360455
              </a>
            </div>
          </div>
        )}
      </header>
      )}

      {activeView === 'bookings' || activeView === 'track-order' || activeView === 'admin' ? (
        <MyBookings 
          initialAdminMode={activeView === 'admin'} 
          onlyShowType={activeView === 'bookings' ? 'appointments' : activeView === 'track-order' ? 'orders' : null}
          onBackToHome={() => { setActiveView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        />
      ) : (
        <>
          {/* 2. HERO SECTION */}
          <motion.section 
            className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-[#FDFBF7]/90 via-[#F9F6F0]/90 to-[#FDFBF7]/90 z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
        {/* Subtle warm decorative blurs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#115E59]/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-10 w-80 h-80 rounded-full bg-[#0F766E]/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide mb-6">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('hero.badge')}
            </div>

            {/* Main Header */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#1E293B] tracking-tight leading-[1.08] mb-8">
              {language === 'en' ? (
                <>
                  Trusted Holistic Healing <br className="hidden sm:inline" />
                  &amp; <span className="text-gradient-neon">Authentic Homoeopathic</span> Remedies
                </>
              ) : (
                <>
                  विश्वसनीय समग्र उपचार <br className="hidden sm:inline" />
                  और <span className="text-gradient-neon">प्रामाणिक होम्योपैथिक</span> दवाएं
                </>
              )}
            </h1>

            {/* About Us Copy */}
            <p className="text-base sm:text-lg md:text-xl text-[#64748B] leading-relaxed max-w-3xl mb-12">
              {t('hero.subtitle')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl md:max-w-none">
              <a 
                href="#book-slot" 
                onClick={(e) => smoothScroll(e, 'book-slot')}
                className="btn-neon-emerald py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                {t('hero.bookBtn')}
              </a>
              <a 
                href="#retail-buy" 
                onClick={(e) => smoothScroll(e, 'retail-buy')}
                className="btn-neon-cyan-outline py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <ShoppingBag className="w-4.5 h-4.5 shrink-0 text-[#115E59]" />
                {t('hero.buyBtn')}
              </a>
              <a 
                href="#bulk-orders" 
                onClick={(e) => smoothScroll(e, 'bulk-orders')}
                className="btn-neon-cyan-outline py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <Briefcase className="w-4.5 h-4.5 shrink-0 text-[#115E59]" />
                {t('hero.wholesaleBtn')}
                <ArrowUpRight className="w-4 h-4 text-[#115E59]" />
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 3. CREDIBILITY ROW */}
      {/* ABOUT US SECTION */}
      <motion.section 
        id="about" 
        className="py-16 bg-white/90 border-b border-[#EAE5DC] relative z-10 scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">{t('about.title')}</h2>
          <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
            {t('about.text')}
          </p>
        </div>
      </motion.section>

      {/* 3. CREDIBILITY ROW */}
      <motion.section 
        id="credibility" 
        className="border-b border-[#EAE5DC] bg-[#F9F6F0]/90 py-12 relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Metric Column 1 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] flex items-center justify-center text-[#115E59] shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">{t('credibility.certTitle')}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {t('credibility.certText')}
                </p>
              </div>
            </div>

            {/* Metric Column 2 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] flex items-center justify-center text-[#0F766E] shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">{t('credibility.servedTitle')}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {t('credibility.servedText')}
                </p>
              </div>
            </div>

            {/* Metric Column 3 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
                <Star className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">{t('credibility.ratingTitle')}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {t('credibility.ratingText')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* 3.5 MEET THE OWNER / FOUNDER SECTION */}
      <motion.section 
        id="meet-owner" 
        className="py-24 bg-white border-b border-[#EAE5DC] relative z-10 overflow-hidden scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        {/* Decorative backdrop graphics */}
        <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full bg-[#115E59]/5 blur-[120px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Premium Framed Portrait */}
            <div className="lg:col-span-5 flex justify-center lg:justify-start">
              <div className="relative group max-w-sm w-full">
                
                {/* Glowing Aura Backdrop */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-600/10 via-amber-500/5 to-teal-600/10 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Gold/Emerald Border Frame */}
                <div className="relative rounded-2xl overflow-hidden border border-[#EAE5DC] bg-gradient-to-b from-[#FDFBF7] to-[#F5EFE6] p-4.5 shadow-xl shadow-[#EFEAE2] transition-transform duration-500 group-hover:scale-[1.02]">
                  
                  {/* Glassmorphic overlay ring */}
                  <div className="absolute inset-0 border-2 border-white/50 rounded-xl pointer-events-none z-10"></div>
                  
                  {/* Photo Container */}
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/40 border border-[#EAE5DC]/60 relative flex items-end justify-center">
                    
                    {/* Portrait Image */}
                    <img 
                      src="/owner.png" 
                      alt="Mr. Rahul Kumar - Owner & Proprietor" 
                      className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Elegant overlay badge */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md border border-[#EAE5DC] rounded-xl p-3 shadow-md text-center z-20">
                      <span className="block text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">{t('meetOwner.subtitle')}</span>
                      <span className="block text-xs font-bold text-slate-800 mt-0.5">{t('meetOwner.title')}</span>
                    </div>

                  </div>
                </div>

                {/* Decorative floating details */}
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] shadow-md flex items-center justify-center text-[#115E59] z-20 transition-transform duration-500 group-hover:rotate-12">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white border border-[#EAE5DC] shadow-md rounded-xl py-2 px-3 flex items-center gap-2 z-20 transition-all duration-500 group-hover:-translate-y-1">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">{language === 'en' ? 'Since 1995' : '1995 से'}</span>
                </div>

              </div>
            </div>

            {/* Right Column: Bio Narrative & Philosophy */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Badges & Main Title */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                  {t('meetOwner.badge')}
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
                    {t('meetOwner.title')}
                  </h2>
                  <p className="text-sm font-extrabold text-[#115E59] tracking-wide uppercase flex items-center gap-2">
                    <span>{t('meetOwner.subtitle')}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#115E59]/40"></span>
                    <span>{t('nav.clinicStatus') === 'Clinic Status:' ? 'Kanchan Homoeo Hall' : 'कंचन होम्योपैथी हॉल'}</span>
                  </p>
                </div>
              </div>

              {/* Bio Narrative Text */}
              <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  {t('meetOwner.p1')}
                </p>
                <p>
                  {t('meetOwner.p2')}
                </p>
              </div>

              {/* Legacy Highlight Banner */}
              <div className="bg-[#F9F6F0]/80 border border-[#EAE5DC]/60 rounded-2xl p-6 shadow-sm hover:border-[#115E59]/30 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#115E59]/10 flex items-center justify-center text-[#115E59] shrink-0 font-extrabold text-sm">
                  ✨
                </div>
                <div>
                  <span className="block text-3xs font-extrabold text-[#115E59] uppercase tracking-widest">{t('meetOwner.legacyTitle')}</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{t('meetOwner.legacyText')}</p>
                </div>
              </div>

              {/* Quote Block & Signature */}
              <div className="border-t border-[#EAE5DC]/80 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <blockquote className="text-xs font-semibold italic text-[#115E59] leading-relaxed max-w-md">
                  {t('meetOwner.quote')}
                </blockquote>
                
                {/* Elegant Handwritten Style Signature */}
                <div className="shrink-0 flex flex-col items-end">
                  <span className="font-serif italic text-xl font-bold text-[#115E59] tracking-wide select-none">
                    {t('meetOwner.signature')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('meetOwner.title')}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </motion.section>

      {/* 4. CLINIC APPOINTMENT PORTAL (B2C MODULE) */}
      <motion.section 
        id="book-slot" 
        className="py-24 bg-[#FDFBF7]/90 relative z-10 scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              {t('appointment.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              {t('appointment.title')}
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              {t('appointment.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Doctor Profile Card */}
            <div className="lg:col-span-4 h-full">
              <div className="relative group rounded-3xl overflow-hidden border border-[#EAE5DC] bg-white p-6 shadow-lg shadow-[#EFEAE2]/50 transition-all duration-300 hover:shadow-xl flex flex-col justify-between h-full">
                {/* Decorative glowing gradient ring */}
                <div className="absolute inset-0 border-2 border-white/50 rounded-3xl pointer-events-none z-10"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
                
                <div className="space-y-6">
                  {/* Doctor Photo centered in circle */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-48 rounded-full p-1.5 bg-gradient-to-tr from-[#115E59] via-emerald-250 to-amber-500 shadow-md">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border border-white/20 relative">
                        <img 
                          src="/doctor.jpg" 
                          alt="Dr. Harjeet Singh - Expert Consulting Physician" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      
                      {/* Active Status Beacon */}
                      <span className="absolute bottom-2 right-4 flex h-4.5 w-4.5 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="text-center space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#115E59]/5 border border-[#115E59]/10 text-[#115E59] text-[10px] font-black uppercase tracking-wider">
                      <span>🩺 {language === 'en' ? 'Senior OPD Physician' : 'वरिष्ठ ओपीडी चिकित्सक'}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-[#1A2421] tracking-tight">
                        {language === 'en' ? 'Dr. Harjeet Singh' : 'डॉ. हरजीत सिंह'}
                      </h3>
                      <p className="text-[10px] font-extrabold text-[#115E59] tracking-wider uppercase leading-none">
                        {language === 'en' ? 'Senior Consulting Physician' : 'वरिष्ठ परामर्श चिकित्सक'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-gradient-to-r from-transparent via-[#EAE5DC] to-transparent my-1"></div>

                  {/* Doctor Info Rows */}
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs">⭐</span>
                      <span>
                        {language === 'en' ? 'Expertise: Chronic diagnostics, biochemic formulations, and root-cause homoeopathic dilutions.' : 'विशेषज्ञता: क्रोनिक डायग्नोस्टिक्स, बायोकेमिक फॉर्मूलेशन और मूल-कारण होम्योपैथिक डाइल्यूशन।'}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs">🕒</span>
                      <span>
                        <strong>{language === 'en' ? 'OPD Hours:' : 'ओपीडी समय:'}</strong> {language === 'en' ? '3:00 PM — 5:00 PM (Monday-Saturday)' : 'दोपहर 3:00 बजे — शाम 5:00 बजे (सोमवार-शनिवार)'}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs">📍</span>
                      <span>
                        <strong>{language === 'en' ? 'OPD Slip:' : 'ओपीडी पर्ची:'}</strong> {language === 'en' ? 'Token confirmed instantly for counters in Ranchi.' : 'रांची में काउंटरों के लिए टोकन तुरंत पुष्ट किया जाता है।'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quote / Assurance */}
                <div className="mt-6 pt-5 border-t border-[#EAE5DC]/60 text-center">
                  <p className="text-3xs italic font-black text-slate-400 leading-normal uppercase tracking-wider">
                    {language === 'en' ? '"Dedicated to safe, gentle, and holistic wellness for every family."' : '"प्रत्येक परिवार के लिए सुरक्षित, सौम्य और समग्र कल्याण के लिए समर्पित।"'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Appointment Scheduler */}
            <div className="lg:col-span-8 relative">
              <BookingCalendar />
            </div>
          </div>

          {/* 🌟 PREMIUM CLINIC PRO-TIP PORTAL INDICATOR */}
          <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start gap-4 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <span className="text-xl">💡</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#115E59]">
                {t('appointment.tipTitle')}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {language === 'en' ? (
                  <>
                    Need an official slip of your confirmed or pending spot for verification? 
                    Go to the <button onClick={() => { setActiveView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#115E59] font-extrabold underline cursor-pointer hover:text-[#0D4F4A] bg-transparent border-0 p-0 inline">My Bookings</button> tab in the main navigation menu above. You can view your current slips automatically or lookup history securely by phone number — **no password or email login required!**
                  </>
                ) : (
                  <>
                    सत्यापन के लिए अपने पुष्ट या लंबित स्लॉट की आधिकारिक पर्ची चाहिए?
                    ऊपर मुख्य नेविगेशन मेनू में <button onClick={() => { setActiveView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#115E59] font-extrabold underline cursor-pointer hover:text-[#0D4F4A] bg-transparent border-0 p-0 inline">मेरे अपॉइंटमेंट</button> टैब पर जाएं। आप अपनी वर्तमान पर्चियां देख सकते हैं या फोन नंबर द्वारा सुरक्षित रूप से इतिहास खोज सकते हैं — **कोई पासवर्ड या ईमेल लॉगिन आवश्यक नहीं है!**
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ELEGANT SECTION DIVIDER 1 */}
      <div className="relative w-full overflow-hidden bg-[#F9F6F0]/90 border-y border-[#EAE5DC] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#0F766E]">{t('dividers.shift')}</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0F766E]/30 via-[#EAE5DC] to-[#115E59]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">{t('dividers.delivery')}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#115E59]"></div>
          </div>
        </div>
      </div>

      {/* 4.5 RETAIL BUY PORTAL (B2C REMEDIES) */}
      <motion.section 
        id="retail-buy" 
        className="py-24 bg-white/90 relative z-10 scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(17,94,89,0.03),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              {t('retail.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              {t('retail.title')}
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              {t('retail.subtitle')}
            </p>
          </div>

          <RetailForm />

        </div>
      </motion.section>

      {/* ELEGANT SECTION DIVIDER 2 */}
      <div className="relative w-full overflow-hidden bg-[#F9F6F0]/90 border-y border-[#EAE5DC] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#0F766E]">{t('dividers.shift')}</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0F766E]/30 via-[#EAE5DC] to-[#115E59]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">{t('dividers.wholesale')}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#115E59]"></div>
          </div>
        </div>
      </div>

      {/* 5. B2B BULK PROCUREMENT PORTAL */}
      <motion.section 
        id="bulk-orders" 
        className="py-24 bg-white/90 relative z-10 scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(15,118,110,0.03),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-semibold uppercase tracking-wider">
              {t('bulk.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              {t('bulk.title')}
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              {t('bulk.subtitle')}
            </p>
          </div>

          {/* B2B wide layout form component */}
          <BulkForm />

        </div>
      </motion.section>

      {/* 6. CONTACT & LOCATION HUB */}
      <motion.section 
        id="contact" 
        className="py-24 bg-[#FDFBF7]/90 border-t border-[#EAE5DC] relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Left: Contact Info, Badge and Hours */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
              
              {/* Badge & Title */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase transition-all ${
                    isOpenNow 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm animate-pulse' 
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {isOpenNow ? t('nav.openNow') : t('nav.closedOnline')}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-[#1E293B] tracking-tight">
                  {language === 'en' ? (
                    <>Clinic Location &amp; <br />Contact Hub</>
                  ) : (
                    <>क्लिनिक स्थान &amp; <br />संपर्क केंद्र</>
                  )}
                </h2>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  {t('contact.subtitle')}
                </p>
              </div>

              {/* Hours Table */}
              <div className="bg-white border border-[#EAE5DC] rounded-2xl p-5 space-y-4 shadow-md shadow-[#EFEAE2]">
                <h3 className="font-semibold text-[#1E293B] text-sm uppercase tracking-widest border-b border-[#EAE5DC] pb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#115E59]" />
                  {t('contact.timingsTitle')}
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[#1E293B]/85">
                    <span>{t('contact.monSat')}</span>
                    <span className="font-bold text-[#1E293B]">10:30 AM — 08:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center text-[#64748B]/70">
                    <span>{t('contact.sunday')}</span>
                    <span className="font-semibold">{t('contact.sundayClosed')}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#EAE5DC] flex justify-between items-center text-[#1E293B]/85">
                    <span className="text-[#0F766E] font-semibold">{t('contact.docConsult')}</span>
                    <span className="font-bold text-[#0F766E]">03:00 PM — 05:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Contact Metric Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#EAE5DC] rounded-2xl space-y-2 shadow-md shadow-[#EFEAE2]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#115E59]">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="block text-3xs font-extrabold text-[#64748B] uppercase tracking-wider">{t('contact.hotline')}</span>
                  <a href="tel:9431360455" className="text-xs font-bold text-[#1E293B] hover:text-[#115E59] transition-colors">9431360455</a>
                </div>

                <div className="p-4 bg-white border border-[#EAE5DC] rounded-2xl space-y-2 shadow-md shadow-[#EFEAE2]">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="block text-3xs font-extrabold text-[#64748B] uppercase tracking-wider">{t('contact.emailUs')}</span>
                  <a href="mailto:kanchanhomoeohall@gmail.com" className="text-xs font-bold text-[#1E293B] hover:text-[#0F766E] transition-colors break-all">kanchanhomoeohall@gmail.com</a>
                </div>
              </div>

            </div>

            {/* Right: Embedded Map & Physical Address */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              {/* Google Maps Embed */}
              <div className="bg-white border border-[#EAE5DC] rounded-2xl overflow-hidden shadow-md shadow-[#EFEAE2] flex-1 min-h-[340px] relative">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3664.2693892782806!2d85.31629917604546!3d23.37631500318536!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f4e11b8c4bc5f5%3A0x6bf748515c6e9208!2sKANCHAN%20HOMOEO%20HALL!5e0!3m2!1sen!2sin!4v1716200000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '340px', display: 'block' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Kanchan Homoeo Hall Location Map"
                ></iframe>
              </div>

              {/* Physical Address Footer */}
              <div className="flex gap-4 items-center bg-white p-4 border border-[#EAE5DC] rounded-xl shadow-md shadow-[#EFEAE2]">
                <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{t('contact.addressTitle')}</h4>
                  <p className="text-2xs text-[#64748B] mt-0.5">{t('contact.addressText')}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </motion.section>
        </>
      )}

      {/* 7. PREMIUM FOOTER */}
      <footer className="bg-white/90 border-t border-[#EAE5DC] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-2xs text-[#64748B] font-medium">
          
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#115E59]" />
            <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="hover:text-[#1A2421] transition-colors">{t('footer.contact')}</a>
          </div>

        </div>
      </footer>

    </div>
  );
}
