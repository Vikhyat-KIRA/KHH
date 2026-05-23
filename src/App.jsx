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
import BookingCalendar from './components/BookingCalendar';
import BulkForm from './components/BulkForm';
import MyBookings from './components/MyBookings';
import RetailForm from './components/RetailForm';

export default function App() {
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/$/, "");
      if (path === '/admin-panel' || path.endsWith('/admin-panel')) {
        return 'admin';
      } else if (path === '/bookings' || path.endsWith('/bookings')) {
        return 'bookings';
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
        document.title = "My Confirmed Spots & Slips | Kanchan Homoeo Hall Ranchi";
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', 'View, track, or verify your scheduled doctor consultations at Kanchan Homoeo Hall Ranchi. Easily check status using your phone number.');
        }
      } else {
        document.title = "Kanchan Homoeo Hall | Trusted Homoeopathic Care & Wholesale Remedies in Ranchi";
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', 'Kanchan Homoeo Hall — trusted holistic healthcare in Ranchi, Jharkhand. Specializing in safe, gentle, and effective homoeopathic treatments, premium natural remedies, wholesale medicine distribution, and dedicated patient support.');
        }
      }
    } catch (e) {
      console.error("SEO update error", e);
    }
  }, [activeView]);

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

      {/* Background Watermark */}
      <div className="bg-watermark"></div>
      
      {/* 1. PREMIUM HEADER / NAVIGATION BAR */}
      {activeView !== 'admin' && (
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-[#EAE5DC] transition-all duration-300 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#115E59] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
              <Activity className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#1A2421] group-hover:text-[#115E59] transition-colors">
                KANCHAN<span className="text-[#0F766E]"> HOMOEO HALL</span>
              </span>
              <span className="hidden sm:block text-4xs font-bold uppercase tracking-widest text-[#5A6561] -mt-1">
                Holistic Healing &amp; Homoeopathic Remedies — Ranchi
              </span>
              <span className="block sm:hidden text-[8px] font-bold uppercase tracking-widest text-[#5A6561] -mt-1">
                Homoeopathy — Ranchi
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold tracking-wide">
            <button
              onClick={() => {
                setActiveView('main');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'main' ? 'text-[#115E59]' : 'text-[#5A6561] hover:text-[#115E59]'
              }`}
            >
              Home
            </button>
            <a href="#credibility" onClick={(e) => smoothScroll(e, 'credibility')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">About</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Meet the Owner</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Appointments</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Buy Remedies</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-[#5A6561] hover:text-[#0F766E] transition-colors">Wholesale</a>
            <button
              onClick={() => {
                setActiveView('bookings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer bg-transparent border-0 font-semibold tracking-wide p-0 ${
                activeView === 'bookings' ? 'text-[#115E59]' : 'text-[#5A6561] hover:text-[#115E59]'
              }`}
            >
              My Bookings
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Location</a>
          </nav>

          {/* Quick CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase transition-colors ${
              isOpenNow 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse' 
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              {isOpenNow ? 'Open Now — Counter Active' : 'Closed — Taking Online Appointments'}
            </span>
            <a 
              href="tel:9431360455"
              className="py-2 px-4.5 bg-[#115E59] text-white font-bold text-xs rounded-lg shadow-md hover:bg-[#0D4F4A] hover:shadow-lg active:scale-95 transition-all uppercase tracking-wider"
            >
              Call Now
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#5A6561] hover:text-[#115E59] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-[#EAE5DC] p-6 flex flex-col gap-5 animate-fade-in shadow-md shadow-[#EFEAE2]">
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
              Home
            </button>
            <a href="#credibility" onClick={(e) => smoothScroll(e, 'credibility')} className="text-base font-semibold text-[#1A2421]">About</a>
            <a href="#meet-owner" onClick={(e) => smoothScroll(e, 'meet-owner')} className="text-base font-semibold text-[#1A2421]">Meet the Owner</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-base font-semibold text-[#1A2421]">Appointments</a>
            <a href="#retail-buy" onClick={(e) => smoothScroll(e, 'retail-buy')} className="text-base font-semibold text-[#1A2421]">Buy Remedies (Retail)</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-base font-semibold text-[#1A2421]">Wholesale</a>
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
              My Bookings
            </button>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-base font-semibold text-[#1A2421]">Location</a>
            
            <div className="border-t border-[#EAE5DC] pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6561] font-bold tracking-wider uppercase">Clinic Status:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold tracking-widest border uppercase ${
                  isOpenNow 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {isOpenNow ? 'Open Now — Counter Active' : 'Closed — Taking Online Appointments'}
                </span>
              </div>
              <a 
                href="tel:9431360455"
                className="w-full text-center py-3 bg-[#115E59] text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-[#0D4F4A]"
              >
                Call Now — 9431360455
              </a>
            </div>
          </div>
        )}
      </header>
      )}

      {activeView === 'bookings' || activeView === 'admin' ? (
        <MyBookings initialAdminMode={activeView === 'admin'} onBackToHome={() => { setActiveView('main'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      ) : (
        <>
          {/* 2. HERO SECTION */}
          <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-[#FDFBF7]/90 via-[#F9F6F0]/90 to-[#FDFBF7]/90 z-10">
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
              Trusted Holistic Healing &amp; Authentic Homoeopathic Remedies
            </div>

            {/* Main Header */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#1E293B] tracking-tight leading-[1.08] mb-8">
              Trusted Holistic Healing <br className="hidden sm:inline" />
              &amp; <span className="text-gradient-neon">Authentic Homoeopathic</span> Remedies
            </h1>

            {/* About Us Copy */}
            <p className="text-base sm:text-lg md:text-xl text-[#64748B] leading-relaxed max-w-3xl mb-12">
              Serving Ranchi with safe, gentle, and effective natural care. Visit our established counter at Upper Bazar or book a personal consultation below.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl md:max-w-none">
              <a 
                href="#book-slot" 
                onClick={(e) => smoothScroll(e, 'book-slot')}
                className="btn-neon-emerald py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                Book Consultation
              </a>
              <a 
                href="#retail-buy" 
                onClick={(e) => smoothScroll(e, 'retail-buy')}
                className="btn-neon-cyan-outline py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <ShoppingBag className="w-4.5 h-4.5 shrink-0 text-[#115E59]" />
                Buy Remedies (Retail)
              </a>
              <a 
                href="#bulk-orders" 
                onClick={(e) => smoothScroll(e, 'bulk-orders')}
                className="btn-neon-cyan-outline py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <Briefcase className="w-4.5 h-4.5 shrink-0 text-[#115E59]" />
                Wholesale Portal
                <ArrowUpRight className="w-4.5 h-4.5 text-[#115E59]" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CREDIBILITY ROW */}
      {/* ABOUT US SECTION */}
      <section className="py-16 bg-white/90 border-b border-[#EAE5DC] relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">About Kanchan Homoeo Hall</h2>
          <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
            Kanchan Homoeo Hall is a premier homoeopathic pharmacy and clinic dedicated to root-cause wellness. Located near Mahabir Chowk, we maintain an extensive, high-grade inventory of classic natural remedies and dilutions. We combine years of trusted community pharmaceutical service with dedicated afternoon consultation sessions to ensure personalized healthcare paths for every patient.
          </p>
        </div>
      </section>

      {/* 3. CREDIBILITY ROW */}
      <section id="credibility" className="border-b border-[#EAE5DC] bg-[#F9F6F0]/90 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Metric Column 1 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] flex items-center justify-center text-[#115E59] shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">AYUSH &amp; GMP Certified</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Every remedy stocked and dispensed at Kanchan Homoeo Hall strictly adheres to AYUSH Ministry guidelines and Good Manufacturing Practices for natural homoeopathic preparations.
                </p>
              </div>
            </div>

            {/* Metric Column 2 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] flex items-center justify-center text-[#0F766E] shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">5,000+ Patients Served</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Trusted by thousands of families across Ranchi and Jharkhand for gentle, individualized homoeopathic care targeting the root cause of health conditions.
                </p>
              </div>
            </div>

            {/* Metric Column 3 */}
            <div className="flex gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
                <Star className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">4.9★ Patient Satisfaction</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Consistently recognized for compassionate care, transparent consultation, and premium-grade homoeopathic dilutions sourced from certified natural pharmacopoeias.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3.5 MEET THE OWNER / FOUNDER SECTION */}
      <section id="meet-owner" className="py-24 bg-white border-b border-[#EAE5DC] relative z-10 overflow-hidden">
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
                      <span className="block text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">Owner &amp; Proprietor</span>
                      <span className="block text-xs font-bold text-slate-800 mt-0.5">Mr. Rahul Kumar</span>
                    </div>

                  </div>
                </div>

                {/* Decorative floating details */}
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-xl bg-white border border-[#EAE5DC] shadow-md flex items-center justify-center text-[#115E59] z-20 transition-transform duration-500 group-hover:rotate-12">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white border border-[#EAE5DC] shadow-md rounded-xl py-2 px-3 flex items-center gap-2 z-20 transition-all duration-500 group-hover:-translate-y-1">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Since 1995</span>
                </div>

              </div>
            </div>

            {/* Right Column: Bio Narrative & Philosophy */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Badges & Main Title */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                  Meet the Owner
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
                    Mr. Rahul Kumar
                  </h2>
                  <p className="text-sm font-extrabold text-[#115E59] tracking-wide uppercase flex items-center gap-2">
                    <span>Owner &amp; Proprietor</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#115E59]/40"></span>
                    <span>Kanchan Homoeo Hall</span>
                  </p>
                </div>
              </div>

              {/* Bio Narrative Text */}
              <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  Welcome to <strong className="text-[#1E293B]">Kanchan Homoeo Hall</strong>. Since 1995, our commitment has been to provide authentic, gentle, and high-quality homoeopathic remedies to the community of Ranchi. We believe in offering access to the finest natural formulations and hosting expert consultation sessions to support your personal wellness journey.
                </p>
                <p>
                  We coordinate closely with experienced consulting doctors who specialize in clinical diagnostics and root-cause homoeopathic therapies. By offering AYUSH-standardized brands alongside dedicated professional consultations, we help you find safe, gentle, and effective pathways to holistic health.
                </p>
              </div>

              {/* Legacy Highlight Banner */}
              <div className="bg-[#F9F6F0]/80 border border-[#EAE5DC]/60 rounded-2xl p-6 shadow-sm hover:border-[#115E59]/30 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#115E59]/10 flex items-center justify-center text-[#115E59] shrink-0 font-extrabold text-sm">
                  ✨
                </div>
                <div>
                  <span className="block text-3xs font-extrabold text-[#115E59] uppercase tracking-widest">Established Legacy</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">Been in this field since 1995</p>
                </div>
              </div>

              {/* Quote Block & Signature */}
              <div className="border-t border-[#EAE5DC]/80 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <blockquote className="text-xs font-semibold italic text-[#115E59] leading-relaxed max-w-md">
                  "We are dedicated to preserving the integrity of traditional homoeopathy, ensuring that pure remedies and expert consultations are always accessible to our community."
                </blockquote>
                
                {/* Elegant Handwritten Style Signature */}
                <div className="shrink-0 flex flex-col items-end">
                  <span className="font-serif italic text-xl font-bold text-[#115E59] tracking-wide select-none">
                    Rahul Kumar
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mr. Rahul Kumar</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 4. CLINIC APPOINTMENT PORTAL (B2C MODULE) */}
      <section id="book-slot" className="py-24 bg-[#FDFBF7]/90 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              Patient Appointment Portal
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              Book Your Consultation Slot
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              Select an available date (Monday–Saturday) and pick a consultation slot between 3:00 PM and 5:00 PM. Appointments are confirmed instantly and stored securely.
            </p>
          </div>

          <div className="relative">
            <BookingCalendar />
          </div>

          {/* 🌟 PREMIUM CLINIC PRO-TIP PORTAL INDICATOR */}
          <div className="mt-8 max-w-4xl mx-auto bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start gap-4 transition-all duration-300 hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <span className="text-xl">💡</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#115E59]">
                Pro Tip: Quick Booking Proof Access
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Need an official slip of your confirmed or pending spot for verification? 
                Go to the <button onClick={() => { setActiveView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#115E59] font-extrabold underline cursor-pointer hover:text-[#0D4F4A] bg-transparent border-0 p-0 inline">My Bookings</button> tab in the main navigation menu above. You can view your current slips automatically or lookup history securely by phone number — **no password or email login required!**
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ELEGANT SECTION DIVIDER 1 */}
      <div className="relative w-full overflow-hidden bg-[#F9F6F0]/90 border-y border-[#EAE5DC] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#0F766E]">Segment Shift</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0F766E]/30 via-[#EAE5DC] to-[#115E59]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">Retail Pharmacy Home Delivery</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#115E59]"></div>
          </div>
        </div>
      </div>

      {/* 4.5 RETAIL BUY PORTAL (B2C REMEDIES) */}
      <section id="retail-buy" className="py-24 bg-white/90 relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(17,94,89,0.03),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              Retail Home Delivery Portal
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              Order Homeopathic Remedies Online
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              Get genuine AYUSH-certified homeopathic dilutions, mother tinctures, and biochemic formulations delivered within 24 hours in Ranchi. Free delivery on orders above ₹500.
            </p>
          </div>

          <RetailForm />

        </div>
      </section>

      {/* ELEGANT SECTION DIVIDER 2 */}
      <div className="relative w-full overflow-hidden bg-[#F9F6F0]/90 border-y border-[#EAE5DC] py-6 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,94,89,0.04)_0%,rgba(15,118,110,0.04)_100%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#0F766E]">Segment Shift</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0F766E]/30 via-[#EAE5DC] to-[#115E59]/30 mx-4 hidden md:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#115E59]">Wholesale Medicine Distribution</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#115E59]"></div>
          </div>
        </div>
      </div>

      {/* 5. B2B BULK PROCUREMENT PORTAL */}
      <section id="bulk-orders" className="py-24 bg-white/90 relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(15,118,110,0.03),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-semibold uppercase tracking-wider">
              Institutional Supply &amp; Bulk Orders
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] tracking-tight">
              Institutional Supply &amp; Bulk Medicine Orders
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
              For retail clinics, research batches, or wholesale distribution requests. Our team responds within 24 hours.
            </p>
          </div>

          {/* B2B wide layout form component */}
          <BulkForm />

        </div>
      </section>

      {/* 6. CONTACT & LOCATION HUB */}
      <section id="contact" className="py-24 bg-[#FDFBF7]/90 border-t border-[#EAE5DC] relative z-10">
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
                    {isOpenNow ? 'Open Now — Counter Active' : 'Closed — Taking Online Appointments'}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-[#1E293B] tracking-tight">
                  Clinic Location &amp; <br />
                  Contact Hub
                </h2>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Visit us at our clinic near Mahabir Chowk in Upper Bazar, Ranchi. Walk-in consultations are welcome during clinic hours. Online appointment booking is available 24/7.
                </p>
              </div>

              {/* Hours Table */}
              <div className="bg-white border border-[#EAE5DC] rounded-2xl p-5 space-y-4 shadow-md shadow-[#EFEAE2]">
                <h3 className="font-semibold text-[#1E293B] text-sm uppercase tracking-widest border-b border-[#EAE5DC] pb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#115E59]" />
                  Clinic Timings
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[#1E293B]/85">
                    <span>Monday — Saturday</span>
                    <span className="font-bold text-[#1E293B]">10:30 AM — 08:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center text-[#64748B]/70">
                    <span>Sunday</span>
                    <span className="font-semibold">Closed (Weekly Day Off)</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#EAE5DC] flex justify-between items-center text-[#1E293B]/85">
                    <span className="text-[#0F766E] font-semibold">Doctor Consultation</span>
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
                  <span className="block text-3xs font-extrabold text-[#64748B] uppercase tracking-wider">Direct Hotline</span>
                  <a href="tel:9431360455" className="text-xs font-bold text-[#1E293B] hover:text-[#115E59] transition-colors">9431360455</a>
                </div>

                <div className="p-4 bg-white border border-[#EAE5DC] rounded-2xl space-y-2 shadow-md shadow-[#EFEAE2]">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0F766E]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="block text-3xs font-extrabold text-[#64748B] uppercase tracking-wider">Email Us</span>
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
                  <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Clinic Address</h4>
                  <p className="text-2xs text-[#64748B] mt-0.5">Kanchan Homoeo Hall, Near Mahabir Chowk, PyadaToli, Upper Bazar, Ranchi, Jharkhand 834001</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>
        </>
      )}

      {/* 7. PREMIUM FOOTER */}
      <footer className="bg-white/90 border-t border-[#EAE5DC] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-2xs text-[#64748B] font-medium">
          
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#115E59]" />
            <span>&copy; {new Date().getFullYear()} Kanchan Homoeo Hall, Ranchi. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="hover:text-[#1A2421] transition-colors">Contact Us</a>
            <button
              onClick={() => {
                localStorage.removeItem('clinic_appointments');
                localStorage.removeItem('clinic_appointments_seeded');
                localStorage.removeItem('user_local_bookings');
                localStorage.removeItem('bulk_orders');
                window.location.reload();
              }}
              className="text-rose-600 hover:text-rose-800 transition-colors font-extrabold uppercase tracking-wider bg-transparent border-0 cursor-pointer p-0 flex items-center gap-1"
              title="Wipes all localStorage mock appointments and seed caches to start testing from a clean slate"
            >
              ⚙️ Reset Demo (Wipe Cache)
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
