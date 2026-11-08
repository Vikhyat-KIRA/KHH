import { useState, useEffect } from 'react';
import { 
  Building, 
  PhoneCall, 
  Mail, 
  Clock, 
  Users, 
  Star, 
  ShieldCheck, 
  ArrowUpRight, 
  CalendarDays, 
  Briefcase,
  Menu,
  X,
  ShoppingBag,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingCalendar from './components/BookingCalendar';
import InstallButton from './components/InstallButton.jsx';
import BulkForm from './components/BulkForm';
import MyBookings from './components/MyBookings';
import RetailForm from './components/RetailForm';
import AdminDashboard from './components/AdminDashboard';
import { useLanguage } from './context/LanguageContext';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-[#D3D9E4] rounded-xl mb-3 overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 text-left flex justify-between items-center bg-white hover:bg-slate-50 transition-colors cursor-pointer border-0"
      >
        <span className="font-bold text-slate-800 text-sm">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-emerald-600">
          <X className={`w-4 h-4 transform ${isOpen ? 'rotate-0' : 'rotate-45'}`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 text-xs text-slate-600 leading-relaxed bg-white"
          >
            <div className="pb-4 pt-2 border-t border-slate-100">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


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

  // Keep the URL in step with activeView (History API)
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
    }, 3000);
    return () => clearTimeout(introTimer);
  }, []);

  // Page title and meta description follow the active view
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
      } else if (activeView === 'admin') {
        document.title = language === 'en' ? 'Pharmacist Admin Portal - Kanchan Homoeo Hall' : 'फार्मासिस्ट एडमिन पोर्टल - कंचन होम्योपैथी हॉल';
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

  // Open/closed badge. Mon-Sat, 10:30 AM to 8:00 PM IST
  useEffect(() => {
    const checkStatus = () => {
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

        const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short'
        });
        const weekdayStr = weekdayFormatter.format(now);
        const isSunday = weekdayStr === 'Sun';

        const decimalTime = hour + minute / 60;

        if (isSunday) {
          setIsOpenNow(false);
        } else {
          setIsOpenNow(decimalTime >= 10.5 && decimalTime < 20.0);
        }
      } catch {
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
    <div className="min-h-screen bg-[#F2F4F7] text-[#0E1626] selection:bg-[#1B3FA0]/20 selection:text-[#1B3FA0] font-sans relative z-0">
      
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

      {/* Language Selection Overlay */}
      {!showIntro && showLanguageSelect && (
        <div className="language-overlay animate-fade-in">
          <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-[#1B3FA0]/5 blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-[#2A55C7]/5 blur-[100px] pointer-events-none"></div>
          
          <div className="language-card panel max-w-md w-full mx-6 p-8 rounded-3xl relative overflow-hidden transition-all text-center">
            <div className="absolute top-0 left-0 right-0 h-2 bg-vial"></div>
            
            <img src="/logo.png" alt="Kanchan Homoeo Hall" className="w-24 h-24 rounded-full object-cover mx-auto mb-5 shadow-card ring-4 ring-paper-deep" />
            
            <h2 className="font-display font-extrabold text-2xl tracking-tight text-[#0E1626] mb-2">
              KANCHAN <span className="text-[#2A55C7]">HOMOEO HALL</span>
            </h2>
            <p className="text-2xs font-semibold text-ink-muted mb-6">
              Homoeopathy and wholesale, Ranchi
            </p>
            
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#D3D9E4] to-transparent my-6"></div>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
              Choose Your Language / भाषा का चयन करें
            </p>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setLanguage('en');
                  setShowLanguageSelect(false);
                }}
                className="w-full py-4 px-6 bg-white border-2 border-[#D3D9E4] text-[#0E1626] font-extrabold text-sm rounded-xl shadow-sm hover:border-[#1B3FA0] hover:bg-[#1B3FA0]/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-black text-slate-800 group-hover:text-[#1B3FA0]">English</span>
                  <span className="text-4xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">Explore Site in English</span>
                </span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[#1B3FA0]/10 group-hover:text-[#1B3FA0] flex items-center justify-center font-bold text-2xs transition-all">EN</span>
              </button>
              
              <button
                onClick={() => {
                  setLanguage('hi');
                  setShowLanguageSelect(false);
                }}
                className="w-full py-4 px-6 bg-white border-2 border-[#D3D9E4] text-[#0E1626] font-extrabold text-sm rounded-xl shadow-sm hover:border-[#1B3FA0] hover:bg-[#1B3FA0]/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-black text-slate-800 group-hover:text-[#1B3FA0]">हिन्दी (Hindi)</span>
                  <span className="text-4xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">वेबसाइट हिन्दी में देखें</span>
                </span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[#1B3FA0]/10 group-hover:text-[#1B3FA0] flex items-center justify-center font-bold text-2xs transition-all">HI</span>
              </button>
            </div>
            
            <div className="mt-8 text-4xs font-bold text-[#566074] leading-relaxed uppercase tracking-wider">
              <div>Your Wellness, Our Heritage</div>
              <div className="text-slate-400 mt-1">आपका स्वास्थ्य, हमारी धरोहर</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-watermark"></div>
      
      {/* HEADER / NAVIGATION BAR */}
      {activeView !== 'admin' && (
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-[#D3D9E4] transition-all duration-300 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Kanchan Homoeo Hall" className="w-11 h-11 rounded-full object-cover shrink-0 shadow-md ring-1 ring-rule transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-105" />
            <div className="flex flex-col justify-center">
              <span className="font-display font-extrabold text-xl tracking-tight text-[#0E1626] group-hover:text-[#1B3FA0] transition-colors block whitespace-nowrap leading-none">
                KANCHAN<span className="text-[#2A55C7]"> HOMOEO HALL</span>
              </span>
              <span className="text-2xs font-medium text-ink-muted mt-1 whitespace-nowrap leading-none">
                Homoeopathy since 1995, Ranchi
              </span>
            </div>
          </a>

          <nav className="hidden xl:flex items-center gap-4 text-[13px] font-semibold tracking-wide">
            <button
              onClick={() => {
                setActiveView('main');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'main' ? 'text-[#1B3FA0]' : 'text-[#566074] hover:text-[#1B3FA0]'
              }`}
            >
              {t('nav.home')}
            </button>
            <a href="#about" onClick={(e) => smoothScroll(e, 'about')} className="text-[#566074] hover:text-[#1B3FA0] transition-colors">{t('nav.about')}</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-[#566074] hover:text-[#1B3FA0] transition-colors">{t('nav.owner')}</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-[#566074] hover:text-[#1B3FA0] transition-colors">{t('nav.appointments')}</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-[#566074] hover:text-[#1B3FA0] transition-colors">{t('nav.buyRemedies')}</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-[#566074] hover:text-[#2A55C7] transition-colors">{t('nav.wholesale')}</a>
            <button
              onClick={() => {
                setActiveView('bookings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'bookings' ? 'text-[#1B3FA0]' : 'text-[#566074] hover:text-[#1B3FA0]'
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
                activeView === 'track-order' ? 'text-[#1B3FA0]' : 'text-[#566074] hover:text-[#1B3FA0]'
              }`}
            >
              {t('nav.trackOrder')}
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-[#566074] hover:text-[#1B3FA0] transition-colors">{t('nav.location')}</a>
            
            <div className="relative group/lang select-none z-50">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D3D9E4] hover:border-[#1B3FA0] text-xs font-bold text-[#1B3FA0] bg-[#E9EDF3]/50 hover:bg-[#1B3FA0]/5 transition-all cursor-pointer shadow-sm"
                title="Select Language / भाषा चुनें"
              >
                {language === 'en' ? 'English' : 'हिन्दी'} <span className="text-[9px] text-slate-400 group-hover/lang:rotate-180 transition-transform duration-300">▼</span>
              </button>
              
              <div className="absolute right-0 mt-1 w-28 bg-white border border-[#D3D9E4] rounded-xl shadow-lg opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all duration-250 z-50 py-1.5 flex flex-col gap-0.5">
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full text-left px-3 py-1.5 text-xs font-extrabold hover:bg-[#1B3FA0]/5 cursor-pointer flex items-center justify-between ${
                    language === 'en' ? 'text-[#1B3FA0] bg-[#1B3FA0]/5' : 'text-slate-700'
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <span className="text-[10px] text-[#1B3FA0]">✓</span>}
                </button>
                <button
                  onClick={() => setLanguage('hi')}
                  className={`w-full text-left px-3 py-1.5 text-xs font-extrabold hover:bg-[#1B3FA0]/5 cursor-pointer flex items-center justify-between ${
                    language === 'hi' ? 'text-[#1B3FA0] bg-[#1B3FA0]/5' : 'text-slate-700'
                  }`}
                >
                  <span>हिन्दी</span>
                  {language === 'hi' && <span className="text-[10px] text-[#1B3FA0]">✓</span>}
                </button>
              </div>
            </div>
          </nav>

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
              className="py-2 px-4.5 bg-[#1B3FA0] text-white font-bold text-xs rounded-lg shadow-md hover:bg-[#14307D] hover:shadow-lg active:scale-95 transition-all uppercase tracking-wider"
            >
              {t('nav.callNow')}
            </a>
          </div>

          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-[#566074] hover:text-[#1B3FA0] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-[#D3D9E4] p-6 flex flex-col gap-5 animate-fade-in shadow-md shadow-[#EFEAE2]">
            <button
              onClick={() => {
                setActiveView('main');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left text-base font-bold cursor-pointer bg-transparent border-0 p-0 ${
                activeView === 'main' ? 'text-[#1B3FA0]' : 'text-[#0E1626]'
              }`}
            >
              {t('nav.home')}
            </button>
            <a href="#about" onClick={(e) => smoothScroll(e, 'about')} className="text-base font-semibold text-[#0E1626]">{t('nav.about')}</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-base font-semibold text-[#0E1626]">{t('nav.owner')}</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-base font-semibold text-[#0E1626]">{t('nav.appointments')}</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-base font-semibold text-[#0E1626]">{t('nav.buyRemedies')}</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-base font-semibold text-[#0E1626]">{t('nav.wholesale')}</a>
            <button
              onClick={() => {
                setActiveView('bookings');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left text-base font-semibold cursor-pointer bg-transparent border-0 p-0 ${
                activeView === 'bookings' ? 'text-[#1B3FA0]' : 'text-[#0E1626]'
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
                activeView === 'track-order' ? 'text-[#1B3FA0]' : 'text-[#0E1626]'
              }`}
            >
              {t('nav.trackOrder')}
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-base font-semibold text-[#0E1626]">{t('nav.location')}</a>
            
            <div className="border-t border-[#D3D9E4] pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#566074] font-bold tracking-wider uppercase">{t('nav.clinicStatus')}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase ${
                  isOpenNow 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {isOpenNow ? t('nav.openNow') : t('nav.closedOnline')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-[#566074] font-bold tracking-wider uppercase">Language / भाषा:</span>
                <div className="flex rounded-lg border border-[#D3D9E4] p-0.5 bg-[#E9EDF3]/50 shadow-sm select-none">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-[#1B3FA0] text-white shadow-sm'
                        : 'text-[#566074] hover:text-[#1B3FA0]'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('hi')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      language === 'hi'
                        ? 'bg-[#1B3FA0] text-white shadow-sm'
                        : 'text-[#566074] hover:text-[#1B3FA0]'
                    }`}
                  >
                    HI
                  </button>
                </div>
              </div>
              <a 
                href="tel:9431360455"
                className="w-full text-center py-3 bg-[#1B3FA0] text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-[#14307D]"
              >
                {t('nav.callNow')} — 9431360455
              </a>
            </div>
          </div>
        )}
      </header>
      )}

      {activeView === 'bookings' || activeView === 'track-order' ? (
        <MyBookings 
          initialAdminMode={false} 
          onlyShowType={activeView === 'bookings' ? 'appointments' : 'orders'}
          onBackToHome={() => { setActiveView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        />
      ) : activeView === 'admin' ? (
        <AdminDashboard 
          onLogout={() => { setActiveView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        />
      ) : (
        <>
          {/* HERO SECTION */}
          <motion.section 
            className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-[#F2F4F7]/90 via-[#E9EDF3]/90 to-[#F2F4F7]/90 z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#1B3FA0]/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-10 w-80 h-80 rounded-full bg-[#2A55C7]/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide mb-6">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('hero.badge')}
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#0E1626] tracking-tight leading-[1.08] mb-8">
              {language === 'en' ? (
                <>
                  Trusted Healing <br className="hidden sm:inline" />
                  &amp; <span className="text-vial">Authentic Homoeopathic</span> Remedies
                </>
              ) : (
                <>
                  विश्वसनीय समग्र उपचार <br className="hidden sm:inline" />
                  और <span className="text-vial">प्रामाणिक होम्योपैथिक</span> दवाएं
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[#566074] leading-relaxed max-w-3xl mb-12">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl md:max-w-none">
              <a 
                href="#book-slot" 
                onClick={(e) => smoothScroll(e, 'book-slot')}
                className="btn-primary py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                {t('hero.bookBtn')}
              </a>
              <a 
                href="#retail-buy" 
                onClick={(e) => smoothScroll(e, 'retail-buy')}
                className="btn-ghost py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <ShoppingBag className="w-4.5 h-4.5 shrink-0 text-[#1B3FA0]" />
                {t('hero.buyBtn')}
              </a>
              <a 
                href="#bulk-orders" 
                onClick={(e) => smoothScroll(e, 'bulk-orders')}
                className="btn-ghost py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <Briefcase className="w-4.5 h-4.5 shrink-0 text-[#1B3FA0]" />
                {t('hero.wholesaleBtn')}
                <ArrowUpRight className="w-4 h-4 text-[#1B3FA0]" />
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ABOUT US SECTION */}
      <motion.section 
        id="about" 
        className="py-16 bg-white/90 border-b border-[#D3D9E4] relative z-10 scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0E1626] tracking-tight">{t('about.title')}</h2>
          <p className="text-sm md:text-base text-[#566074] leading-relaxed">
            {t('about.text')}
          </p>
        </div>
      </motion.section>

      {/* CREDIBILITY ROW */}
      <motion.section 
        id="credibility" 
        className="border-b border-[#D3D9E4] bg-[#E9EDF3]/90 py-12 relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#D3D9E4] flex items-center justify-center text-[#1B3FA0] shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#0E1626] text-lg tracking-tight">{t('credibility.certTitle')}</h3>
                <p className="text-xs text-[#566074] leading-relaxed">
                  {t('credibility.certText')}
                </p>
              </div>
            </div>

            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#D3D9E4] flex items-center justify-center text-[#2A55C7] shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#0E1626] text-lg tracking-tight">{t('credibility.servedTitle')}</h3>
                <p className="text-xs text-[#566074] leading-relaxed">
                  {t('credibility.servedText')}
                </p>
              </div>
            </div>

            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
                <Star className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#0E1626] text-lg tracking-tight">{t('credibility.ratingTitle')}</h3>
                <p className="text-xs text-[#566074] leading-relaxed">
                  {t('credibility.ratingText')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* MEET THE OWNER SECTION */}
      <motion.section 
        id="meet-owner" 
        className="py-24 bg-white border-b border-[#D3D9E4] relative z-10 overflow-hidden scroll-mt-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full bg-[#1B3FA0]/5 blur-[120px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-5 flex justify-center lg:justify-start">
              <div className="relative group max-w-sm w-full">
                
                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-600/10 via-amber-500/5 to-teal-600/10 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative rounded-2xl overflow-hidden border border-[#D3D9E4] bg-gradient-to-b from-[#F2F4F7] to-[#F5EFE6] p-4.5 shadow-xl shadow-[#EFEAE2] transition-transform duration-500 group-hover:scale-[1.02]">
                  
                  <div className="absolute inset-0 border-2 border-white/50 rounded-xl pointer-events-none z-10"></div>
                  
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/40 border border-[#D3D9E4]/60 relative flex items-end justify-center">
                    
                    <img 
                      src="/owner.png" 
                      alt="Mr. Rahul Kumar - Owner & Proprietor" 
                      className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md border border-[#D3D9E4] rounded-xl p-3 shadow-md text-center z-20">
                      <span className="block text-2xs font-extrabold uppercase tracking-widest text-[#1B3FA0]">{t('meetOwner.subtitle')}</span>
                      <span className="block text-xs font-bold text-slate-800 mt-0.5">{t('meetOwner.title')}</span>
                    </div>

                  </div>
                </div>

                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-xl bg-white border border-[#D3D9E4] shadow-md flex items-center justify-center text-[#1B3FA0] z-20 transition-transform duration-500 group-hover:rotate-12">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white border border-[#D3D9E4] shadow-md rounded-xl py-2 px-3 flex items-center gap-2 z-20 transition-all duration-500 group-hover:-translate-y-1">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">{language === 'en' ? 'Since 1995' : '1995 से'}</span>
                </div>

              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                  {t('meetOwner.badge')}
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0E1626] tracking-tight">
                    {t('meetOwner.title')}
                  </h2>
                  <p className="text-sm font-extrabold text-[#1B3FA0] tracking-wide uppercase flex items-center gap-2">
                    <span>{t('meetOwner.subtitle')}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B3FA0]/40"></span>
                    <span>{t('nav.clinicStatus') === 'Clinic Status:' ? 'Kanchan Homoeo Hall' : 'कंचन होम्योपैथी हॉल'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  {t('meetOwner.p1')}
                </p>
                <p>
                  {t('meetOwner.p2')}
                </p>
              </div>

              <div className="bg-[#E9EDF3]/80 border border-[#D3D9E4]/60 rounded-2xl p-6 shadow-sm hover:border-[#1B3FA0]/30 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1B3FA0]/10 flex items-center justify-center text-[#1B3FA0] shrink-0 font-extrabold text-sm">
                  
                </div>
                <div>
                  <span className="block text-3xs font-extrabold text-[#1B3FA0] uppercase tracking-widest">{t('meetOwner.legacyTitle')}</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{t('meetOwner.legacyText')}</p>
                </div>
              </div>

              <div className="border-t border-[#D3D9E4]/80 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <blockquote className="text-xs font-semibold italic text-[#1B3FA0] leading-relaxed max-w-md">
                  {t('meetOwner.quote')}
                </blockquote>
                
                <div className="shrink-0 flex flex-col items-end">
                  <img src="/signature.png" alt="Rahul Kumar's signature" className="h-14 sm:h-16 w-auto object-contain -mt-2 -rotate-2 transition-transform duration-300 hover:rotate-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('meetOwner.title')}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </motion.section>

      {/* CLINIC APPOINTMENT PORTAL */}
      <motion.section 
        id="book-slot" 
        className="py-24 bg-[#F2F4F7]/90 relative z-10 scroll-mt-20"
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
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0E1626] tracking-tight">
              {t('appointment.title')}
            </h2>
            <p className="text-sm md:text-base text-[#566074] leading-relaxed">
              {t('appointment.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-4 h-full">
              <div className="relative group rounded-3xl overflow-hidden border border-[#D3D9E4] bg-white p-6 shadow-lg shadow-[#EFEAE2]/50 transition-all duration-300 hover:shadow-xl flex flex-col justify-between h-full">
                <div className="absolute inset-0 border-2 border-white/50 rounded-3xl pointer-events-none z-10"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
                
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-48 rounded-full p-1.5 bg-gradient-to-tr from-[#1B3FA0] via-emerald-250 to-amber-500 shadow-md">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border border-white/20 relative">
                        <img 
                          src="/doctor.jpg" 
                          alt="Dr. Harjeet Singh - Expert Consulting Physician" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      
                      <span className="absolute bottom-2 right-4 flex h-4.5 w-4.5 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B3FA0]/5 border border-[#1B3FA0]/10 text-[#1B3FA0] text-[10px] font-black uppercase tracking-wider">
                      <span>{language === 'en' ? 'Senior OPD Physician' : 'वरिष्ठ ओपीडी चिकित्सक'}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-[#0E1626] tracking-tight">
                        {language === 'en' ? 'Dr. Harjeet Singh' : 'डॉ. हरजीत सिंह'}
                      </h3>
                      <p className="text-[10px] font-extrabold text-[#1B3FA0] tracking-wider uppercase leading-none">
                        {language === 'en' ? 'Senior Consulting Physician' : 'वरिष्ठ परामर्श चिकित्सक'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-gradient-to-r from-transparent via-[#D3D9E4] to-transparent my-1"></div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs"></span>
                      <span>
                        {language === 'en' ? 'Expertise: Chronic diagnostics, biochemic formulations, and root-cause homoeopathic dilutions.' : 'विशेषज्ञता: क्रोनिक डायग्नोस्टिक्स, बायोकेमिक फॉर्मूलेशन और मूल-कारण होम्योपैथिक डाइल्यूशन।'}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs"></span>
                      <span>
                        <strong>{language === 'en' ? 'OPD Hours:' : 'ओपीडी समय:'}</strong> {language === 'en' ? '3:00 PM — 5:00 PM (Monday-Saturday)' : 'दोपहर 3:00 बजे — शाम 5:00 बजे (सोमवार-शनिवार)'}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-650 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center shrink-0 font-bold text-teal-600 text-xs"></span>
                      <span>
                        <strong>{language === 'en' ? 'OPD Slip:' : 'ओपीडी पर्ची:'}</strong> {language === 'en' ? 'Token confirmed instantly for counters in Ranchi.' : 'रांची में काउंटरों के लिए टोकन तुरंत पुष्ट किया जाता है।'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[#D3D9E4]/60 text-center">
                  <p className="text-3xs italic font-black text-slate-400 leading-normal uppercase tracking-wider">
                    {language === 'en' ? '"Dedicated to safe, gentle, and wellness for every family."' : '"प्रत्येक परिवार के लिए सुरक्षित, सौम्य और समग्र कल्याण के लिए समर्पित।"'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 relative">
              <BookingCalendar />
            </div>
          </div>

          <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start gap-4 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <span className="text-xl"></span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#1B3FA0]">
                {t('appointment.tipTitle')}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {language === 'en' ? (
                  <>
                    Need an official slip of your confirmed or pending spot for verification? 
                    Go to the <button onClick={() => { setActiveView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#1B3FA0] font-extrabold underline cursor-pointer hover:text-[#14307D] bg-transparent border-0 p-0 inline">My Bookings</button> tab in the main navigation menu above. You can view your current slips automatically or lookup history securely by phone number — **no password or email login required!**
                  </>
                ) : (
                  <>
                    सत्यापन के लिए अपने पुष्ट या लंबित स्लॉट की आधिकारिक पर्ची चाहिए?
                    ऊपर मुख्य नेविगेशन मेनू में <button onClick={() => { setActiveView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#1B3FA0] font-extrabold underline cursor-pointer hover:text-[#14307D] bg-transparent border-0 p-0 inline">मेरे अपॉइंटमेंट</button> टैब पर जाएं। आप अपनी वर्तमान पर्चियां देख सकते हैं या फोन नंबर द्वारा सुरक्षित रूप से इतिहास खोज सकते हैं — **कोई पासवर्ड या ईमेल लॉगिन आवश्यक नहीं है!**
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION DIVIDER 1 */}
      <div className="relative w-full overflow-hidden bg-[#E9EDF3]/90 border-y border-[#D3D9E4] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A55C7]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#2A55C7]">{t('dividers.shift')}</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#2A55C7]/30 via-[#D3D9E4] to-[#1B3FA0]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#1B3FA0]">{t('dividers.delivery')}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B3FA0]"></div>
          </div>
        </div>
      </div>

      {/* RETAIL BUY PORTAL */}
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
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0E1626] tracking-tight">
              {t('retail.title')}
            </h2>
            <p className="text-sm md:text-base text-[#566074] leading-relaxed">
              {t('retail.subtitle')}
            </p>
          </div>

          <RetailForm />

        </div>
      </motion.section>

      {/* SECTION DIVIDER 2 */}
      <div className="relative w-full overflow-hidden bg-[#E9EDF3]/90 border-y border-[#D3D9E4] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A55C7]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#2A55C7]">{t('dividers.shift')}</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#2A55C7]/30 via-[#D3D9E4] to-[#1B3FA0]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#1B3FA0]">{t('dividers.wholesale')}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B3FA0]"></div>
          </div>
        </div>
      </div>

      {/* B2B BULK PROCUREMENT PORTAL */}
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#2A55C7] text-xs font-semibold uppercase tracking-wider">
              {t('bulk.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0E1626] tracking-tight">
              {t('bulk.title')}
            </h2>
            <p className="text-sm md:text-base text-[#566074] leading-relaxed">
              {t('bulk.subtitle')}
            </p>
          </div>

          <BulkForm />

        </div>
      </motion.section>

      {/* SECTION DIVIDER 3 */}
      <div className="relative w-full overflow-hidden bg-[#E9EDF3]/90 border-y border-[#D3D9E4] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A55C7]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#2A55C7]">{t('dividers.shift')}</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#2A55C7]/30 via-[#D3D9E4] to-[#1B3FA0]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#1B3FA0]">CONTACT HUB</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B3FA0]"></div>
          </div>
        </div>
      </div>

      {/* CONTACT & LOCATION HUB */}
      <motion.section 
        id="contact" 
        className="py-24 bg-[#F2F4F7]/90 border-t border-[#D3D9E4] relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
              
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
                <h2 className="text-3xl font-extrabold text-[#0E1626] tracking-tight">
                  {language === 'en' ? (
                    <>Clinic Location &amp; <br />Contact Hub</>
                  ) : (
                    <>क्लिनिक स्थान &amp; <br />संपर्क केंद्र</>
                  )}
                </h2>
                <p className="text-sm text-[#566074] leading-relaxed">
                  {t('contact.subtitle')}
                </p>
              </div>

              <div className="bg-white border border-[#D3D9E4] rounded-2xl p-5 space-y-4 shadow-md shadow-[#EFEAE2]">
                <h3 className="font-semibold text-[#0E1626] text-sm uppercase tracking-widest border-b border-[#D3D9E4] pb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1B3FA0]" />
                  {t('contact.timingsTitle')}
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[#0E1626]/85">
                    <span>{t('contact.monSat')}</span>
                    <span className="font-bold text-[#0E1626]">10:30 AM — 08:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center text-[#566074]/70">
                    <span>{t('contact.sunday')}</span>
                    <span className="font-semibold">{t('contact.sundayClosed')}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#D3D9E4] flex justify-between items-center text-[#0E1626]/85">
                    <span className="text-[#2A55C7] font-semibold">{t('contact.docConsult')}</span>
                    <span className="font-bold text-[#2A55C7]">03:00 PM — 05:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#D3D9E4] rounded-2xl space-y-2 shadow-md shadow-[#EFEAE2]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#1B3FA0]">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="block text-3xs font-extrabold text-[#566074] uppercase tracking-wider">{t('contact.hotline')}</span>
                  <a href="tel:9431360455" className="text-xs font-bold text-[#0E1626] hover:text-[#1B3FA0] transition-colors">9431360455</a>
                </div>

                <div className="p-4 bg-white border border-[#D3D9E4] rounded-2xl space-y-2 shadow-md shadow-[#EFEAE2]">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#2A55C7]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="block text-3xs font-extrabold text-[#566074] uppercase tracking-wider">{t('contact.emailUs')}</span>
                  <a href="mailto:kanchanhomoeohall@gmail.com" className="text-xs font-bold text-[#0E1626] hover:text-[#2A55C7] transition-colors break-all">kanchanhomoeohall@gmail.com</a>
                </div>
              </div>

            </div>

            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              <div className="bg-white border border-[#D3D9E4] rounded-2xl overflow-hidden shadow-md shadow-[#EFEAE2] flex-1 min-h-[340px] relative">
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

              <div className="flex gap-4 items-center bg-white p-4 border border-[#D3D9E4] rounded-xl shadow-md shadow-[#EFEAE2]">
                <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#2A55C7] shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0E1626] uppercase tracking-wider">{t('contact.addressTitle')}</h4>
                  <p className="text-2xs text-[#566074] mt-0.5">{t('contact.addressText')}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </motion.section>

        </>
      )}

      {/* FREQUENTLY ASKED QUESTIONS */}
      <motion.section 
        id="faq" 
        className="py-24 bg-white/90 relative z-10 border-t border-[#D3D9E4]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(17,94,89,0.02),transparent)] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0E1626] tracking-tight">
              {language === 'en' ? 'Frequently Asked Questions' : 'अक्सर पूछे जाने वाले प्रश्न'}
            </h2>
            <p className="text-sm md:text-base text-[#566074] leading-relaxed">
              {language === 'en' ? 'Everything you need to know about our remedies, consultation, and delivery.' : 'हमारी दवाओं, परामर्श और डिलीवरी के बारे में वह सब कुछ जो आपको जानना चाहिए।'}
            </p>
          </div>
          
          <div className="space-y-1">
            <FAQItem 
              question={language === 'en' ? 'What are the clinic timings?' : 'क्लिनिक का समय क्या है?'} 
              answer={language === 'en' ? 'Our clinic is open from Monday to Saturday, 10:30 AM to 8:00 PM. We are closed on Sundays.' : 'हमारा क्लिनिक सोमवार से शनिवार सुबह 10:30 बजे से रात 8:00 बजे तक खुला रहता है। रविवार को क्लिनिक बंद रहता है।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'Do you deliver homeopathic remedies?' : 'क्या आप होम्योपैथिक दवाएं वितरित करते हैं?'} 
              answer={language === 'en' ? 'Yes, we provide home delivery within Ranchi. Delivery is free for orders within a 5km radius and for orders above ₹500.' : 'हाँ, हम रांची के भीतर होम डिलीवरी प्रदान करते हैं। 5 किमी के दायरे में और ₹500 से अधिक के ऑर्डर के लिए डिलीवरी मुफ्त है।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'How can I book an appointment with the doctor?' : 'मैं डॉक्टर के साथ अपॉइंटमेंट कैसे बुक कर सकता हूं?'} 
              answer={language === 'en' ? 'You can easily book a slot using the Appointment Scheduler on our homepage. You will get a token pass that you can present at the clinic.' : 'आप हमारे होमपेज पर अपॉइंटमेंट शेड्यूलर का उपयोग करके आसानी से स्लॉट बुक कर सकते हैं। आपको एक टोकन पास मिलेगा जिसे आप क्लिनिक में दिखा सकते हैं।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'Do you accept bulk orders for clinics?' : 'क्या आप क्लीनिक के लिए थोक आदेश स्वीकार करते हैं?'} 
              answer={language === 'en' ? 'Yes! We have a dedicated B2B Wholesale Portal where practitioners and pharmacies can submit bulk queries for special discounted pricing.' : 'हाँ! हमारे पास एक समर्पित B2B थोक पोर्टल है जहां चिकित्सक और फार्मेसियां विशेष रियायती मूल्य निर्धारण के लिए थोक पूछताछ प्रस्तुत कर सकते हैं।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'Are homeopathic medicines safe for children and pregnant women?' : 'क्या होम्योपैथिक दवाएं बच्चों और गर्भवती महिलाओं के लिए सुरक्षित हैं?'} 
              answer={language === 'en' ? 'Yes, homeopathic remedies are generally safe, gentle, and free from side effects. However, we always recommend consulting our doctor before starting any treatment during pregnancy.' : 'हाँ, होम्योपैथिक उपचार आमतौर पर सुरक्षित, कोमल और दुष्प्रभावों से मुक्त होते हैं। हालांकि, हम हमेशा गर्भावस्था के दौरान कोई भी उपचार शुरू करने से पहले हमारे डॉक्टर से परामर्श करने की सलाह देते हैं।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'What payment methods do you accept?' : 'आप किन भुगतान विधियों को स्वीकार करते हैं?'} 
              answer={language === 'en' ? 'We accept Cash, UPI (Google Pay, PhonePe, Paytm), and major Credit/Debit cards at the clinic.' : 'हम क्लिनिक में नकद, यूपीआई (Google Pay, PhonePe, Paytm) और प्रमुख क्रेडिट/डेबिट कार्ड स्वीकार करते हैं।'} 
            />
            <FAQItem 
              question={language === 'en' ? 'How long does a consultation usually take?' : 'परामर्श में आमतौर पर कितना समय लगता है?'} 
              answer={language === 'en' ? 'A first-time consultation usually takes 20-30 minutes as the doctor takes a detailed case history. Follow-up visits are typically 10-15 minutes.' : 'पहली बार के परामर्श में आमतौर पर 20-30 मिनट लगते हैं क्योंकि डॉक्टर विस्तृत केस हिस्ट्री लेते हैं। अनुवर्ती विजिट आमतौर पर 10-15 मिनट की होती हैं।'} 
            />
          </div>

          <div className="mt-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-[#1B3FA0] mb-2">{language === 'en' ? 'Want to know something else?' : 'कुछ और जानना चाहते हैं?'}</h3>
            <p className="text-xs text-[#566074] mb-4">{language === 'en' ? 'If you have more questions, feel free to ask us directly on WhatsApp' : 'यदि आपके पास अधिक प्रश्न हैं, तो बेझिझक हमसे व्हाट्सएप पर पूछें!'}</p>
            <a 
              href="https://wa.me/919431360455?text=Hello%20Kanchan%20Homoeo%20Hall%2C%20I%20have%20a%20question."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE57] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              {language === 'en' ? 'Ask on WhatsApp' : 'व्हाट्सएप पर पूछें'}
            </a>
          </div>

        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="bg-white/90 border-t border-[#D3D9E4] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-2xs text-[#566074] font-medium">
          
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full object-cover" />
            <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          </div>

          <div className="flex items-center gap-6">
            <InstallButton />
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="hover:text-[#0E1626] transition-colors">{t('footer.contact')}</a>
          </div>

        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-5 border-t border-rule">
          <p className="font-display text-xs font-bold text-ink-muted">Built and Maintained By : Vikhyat Gupta</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/919431360455?text=Hello%20Kanchan%20Homoeo%20Hall%2C%20I%20have%20an%20inquiry."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] hover:bg-[#1EBE57] text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-transform transform hover:scale-110"
        style={{ animation: 'bounce 2s infinite' }}
      >
        <MessageCircle className="w-7 h-7" />
      </a>
      
    </div>
  );
}