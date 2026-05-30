import React, { useState, useEffect } from 'react';
import { 
  Building, 
  MapPin, 
  PhoneCall, 
  Mail, 
  Clock, 
  Activity, 
  Award, 
  Users, 
  Star, 
  ShieldCheck, 
  ArrowUpRight, 
  CalendarDays, 
  Briefcase,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import BookingCalendar from './components/BookingCalendar';
import BulkForm from './components/BulkForm';

export default function App() {
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic Open Status Badge logic — Mon–Sat, 10:30 AM to 8:00 PM
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const hour = now.getHours();
      const mins = now.getMinutes();
      const decimalTime = hour + mins / 60;

      // Sunday: always closed
      // Mon–Sat: 10:30 AM (10.5) to 8:00 PM (20.0)
      if (day === 0) {
        setIsOpenNow(false);
      } else {
        setIsOpenNow(decimalTime >= 10.5 && decimalTime < 20.0);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const smoothScroll = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      setMobileMenuOpen(false);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E293B] selection:bg-[#115E59]/20 selection:text-[#115E59] font-sans">
      
      {/* 1. PREMIUM HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#EAE5DC] transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#115E59] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
              <Activity className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#1A2421] group-hover:text-[#115E59] transition-colors">
                KANCHAN<span className="text-[#0F766E]"> HOMOEO</span>
              </span>
              <span className="block text-4xs font-bold uppercase tracking-widest text-[#5A6561] -mt-1">
                Holistic Healing &amp; Natural Remedies — Ranchi
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <a href="#" className="text-[#115E59] hover:text-[#0D4F4A] transition-colors">Home</a>
            <a href="#credibility" onClick={(e) => smoothScroll(e, 'credibility')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">About</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Appointments</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-[#5A6561] hover:text-[#0F766E] transition-colors">Wholesale</a>
            <a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="text-[#5A6561] hover:text-[#115E59] transition-colors">Location</a>
          </nav>

          {/* Quick CTA */}
          <div className="hidden md:flex items-center gap-4">
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
            className="md:hidden p-2 text-[#5A6561] hover:text-[#115E59] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white/98 backdrop-blur-xl border-b border-[#EAE5DC] p-6 flex flex-col gap-5 animate-fade-in shadow-md shadow-[#EFEAE2]">
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-base font-bold text-[#115E59]">Home</a>
            <a href="#credibility" onClick={(e) => smoothScroll(e, 'credibility')} className="text-base font-semibold text-[#1A2421]">About</a>
            <a href="#book-slot" onClick={(e) => smoothScroll(e, 'book-slot')} className="text-base font-semibold text-[#1A2421]">Appointments</a>
            <a href="#bulk-orders" onClick={(e) => smoothScroll(e, 'bulk-orders')} className="text-base font-semibold text-[#1A2421]">Wholesale</a>
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

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-[#FDFBF7] via-[#F9F6F0] to-[#FDFBF7]">
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
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#1E293B] tracking-tight leading-[1.08] mb-8">
              Trusted Holistic Healing<br />
              &amp; <span className="text-gradient-neon">Authentic Homoeopathic</span> Remedies
            </h1>

            {/* About Us Copy */}
            <p className="text-base sm:text-lg md:text-xl text-[#64748B] leading-relaxed max-w-3xl mb-12">
              Serving Ranchi with safe, gentle, and effective natural care. Visit our established counter at Upper Bazar or book a personal consultation below.
            </p>

            {/* Dual Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-md md:max-w-none">
              <a 
                href="#book-slot" 
                onClick={(e) => smoothScroll(e, 'book-slot')}
                className="btn-neon-emerald py-4 px-8 rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                Book Consultation
              </a>
              <a 
                href="#bulk-orders" 
                onClick={(e) => smoothScroll(e, 'bulk-orders')}
                className="btn-neon-cyan-outline py-4 px-8 rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer font-bold text-center"
              >
                <Briefcase className="w-5 h-5 shrink-0" />
                Wholesale Inquiry
                <ArrowUpRight className="w-4.5 h-4.5 text-[#115E59]" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CREDIBILITY ROW */}
      {/* ABOUT US SECTION */}
      <section className="py-16 bg-white border-b border-[#EAE5DC]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">About Kanchan Homoeo Hall</h2>
          <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
            Kanchan Homoeo Hall is a premier homoeopathic pharmacy and clinic dedicated to root-cause wellness. Located near Mahabir Chowk, we maintain an extensive, high-grade inventory of classic natural remedies and dilutions. We combine years of trusted community pharmaceutical service with dedicated afternoon consultation sessions to ensure personalized healthcare paths for every patient.
          </p>
        </div>
      </section>

      {/* 3. CREDIBILITY ROW */}
      <section id="credibility" className="border-b border-[#EAE5DC] bg-[#F9F6F0] py-12">
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

      {/* 4. CLINIC APPOINTMENT PORTAL (B2C MODULE) */}
      <section id="book-slot" className="py-24 bg-[#FDFBF7]">
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
        </div>
      </section>

      {/* ELEGANT SECTION DIVIDER */}
      <div className="relative w-full overflow-hidden bg-[#F9F6F0] border-y border-[#EAE5DC] py-6">
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
      <section id="bulk-orders" className="py-24 bg-white relative">
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
      <section id="contact" className="py-24 bg-[#FDFBF7] border-t border-[#EAE5DC]">
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

      {/* 7. PREMIUM FOOTER */}
      <footer className="bg-white border-t border-[#EAE5DC] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-2xs text-[#64748B] font-medium">
          
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#115E59]" />
            <span>&copy; {new Date().getFullYear()} Kanchan Homoeo Hall, Ranchi. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#115E59] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#0F766E] transition-colors">Terms of Service</a>
            <a href="mailto:kanchanhomoeohall@gmail.com" className="hover:text-[#1A2421] transition-colors">Contact Us</a>
          </div>

        </div>
      </footer>

    </div>
  );
}
