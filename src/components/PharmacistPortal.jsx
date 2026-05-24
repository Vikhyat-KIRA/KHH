import React, { useState } from 'react';
import { Lock, RefreshCw, LogOut, Package, Stethoscope, Briefcase, Clock, Search, ChevronDown, Download, CheckCircle, XCircle } from 'lucide-react';

export default function PharmacistPortal() {
  const [activeTab, setActiveTab] = useState('retail');
  const [overrideStatus, setOverrideStatus] = useState('auto');

  return (
    <div className="min-h-screen bg-[#060B19] text-white font-sans selection:bg-[#0F766E]/30 relative z-0">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0A1020] border-b border-[#1E293B] shadow-lg">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-[0_0_15px_rgba(15,118,110,0.5)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-wider text-white uppercase flex items-center gap-2">
                KHH <span className="text-[#2DD4BF]">PHARMACIST PORTAL</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                LOGISTICS & COMMAND CONSOLE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-full p-1 px-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Package className="w-3.5 h-3.5 text-amber-500"/> Orders <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">0</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Stethoscope className="w-3.5 h-3.5 text-blue-400"/> Consultations <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">0</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Briefcase className="w-3.5 h-3.5 text-purple-400"/> B2B Inquiries <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">0</span></span>
            </div>

            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0F766E] text-[#2DD4BF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#0F766E]/10 transition-colors">
              <RefreshCw className="w-3 h-3" />
              Firebase Sync
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#31112C] border border-[#701A4B] text-[#F43F5E] text-[10px] font-bold uppercase tracking-wider hover:bg-[#4C1236] transition-colors">
              <Lock className="w-3 h-3" />
              Lock Portal
            </button>
            <button 
              onClick={() => { window.location.href = '/' }}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors ml-2">
              Exit Portal
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-12 relative">
        {/* Background Watermark Logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none z-0 mix-blend-screen">
          <img src="/logo.png" alt="Watermark" className="w-[600px] h-[600px] object-contain grayscale" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">Systems Dashboard</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Manage operational status, client orders, and wholesale inquiries.
            </p>
          </div>

          {/* Clinic Override */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-3 flex items-center gap-6 shadow-xl">
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Clock className="w-3 h-3" /> Clinic Override
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                Force Portal Open Status
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#0B1120] p-1 rounded-lg border border-[#1E293B]">
              <button onClick={() => setOverrideStatus('auto')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'auto' ? 'bg-[#0F766E] text-white shadow-[0_0_10px_rgba(15,118,110,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <RefreshCw className="w-3 h-3 text-[#2DD4BF]" /> Auto
              </button>
              <button onClick={() => setOverrideStatus('open')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'open' ? 'bg-[#166534] text-white shadow-[0_0_10px_rgba(22,101,52,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <CheckCircle className="w-3 h-3 text-emerald-500" /> Open
              </button>
              <button onClick={() => setOverrideStatus('closed')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'closed' ? 'bg-[#7F1D1D] text-white shadow-[0_0_10px_rgba(127,29,29,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <XCircle className="w-3 h-3 text-rose-500" /> Closed
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 relative z-10">
          <div className="flex items-center bg-[#111827] border border-[#1E293B] rounded-xl p-1.5">
            <button 
              onClick={() => setActiveTab('retail')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'retail' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Package className={`w-4 h-4 ${activeTab === 'retail' ? 'text-white' : 'text-amber-500'}`} />
              Retail Orders (0)
            </button>
            <button 
              onClick={() => setActiveTab('consultations')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'consultations' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Stethoscope className={`w-4 h-4 ${activeTab === 'consultations' ? 'text-white' : 'text-blue-400'}`} />
              Consultations (0)
            </button>
            <button 
              onClick={() => setActiveTab('wholesale')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'wholesale' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Briefcase className={`w-4 h-4 ${activeTab === 'wholesale' ? 'text-white' : 'text-purple-400'}`} />
              Wholesale Queries (0)
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 relative z-10">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search orders by name, phone, or address..." 
              className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0F766E] transition-colors"
            />
          </div>
          <div className="relative">
            <select className="appearance-none bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-4 pr-10 text-sm text-white font-semibold focus:outline-none focus:border-[#0F766E] transition-colors cursor-pointer outline-none">
              <option>Show All Statuses</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] hover:border-slate-500 rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all">
            <Download className="w-4 h-4 text-blue-400" />
            Export CSV
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-[#111827]/80 backdrop-blur-md border border-[#1E293B] rounded-2xl min-h-[300px] flex flex-col items-center justify-center p-8 relative z-10 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">
            No {activeTab === 'retail' ? 'Retail Orders' : activeTab === 'consultations' ? 'Consultations' : 'Wholesale Queries'} Logged Yet
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Newly placed {activeTab === 'retail' ? 'retail orders' : activeTab === 'consultations' ? 'consultation bookings' : 'wholesale inquiries'} will appear here automatically.
          </p>
        </div>

      </main>
    </div>
  );
}
