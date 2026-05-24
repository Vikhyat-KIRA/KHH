import { useState, useEffect } from 'react';
import { Lock, RefreshCw, Package, Stethoscope, Briefcase, Clock, Search, ChevronDown, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PharmacistPortal() {
  const [activeTab, setActiveTab] = useState('retail');
  const [overrideStatus, setOverrideStatus] = useState('auto');
  
  // Data State
  const [retailOrders, setRetailOrders] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [wholesaleQueries, setWholesaleQueries] = useState([]);
  
  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error' | 'mock'
  const [lastSync, setLastSync] = useState(null);

  const fetchPortalData = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      const response = await fetch('/api/readSheets');
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setRetailOrders(result.data.retailOrders || []);
        setConsultations(result.data.appointments || []);
        setWholesaleQueries(result.data.b2bQueries || []);
        setSyncStatus('success');
      } else if (result.status === 'mock_mode') {
        // Fallback to local storage
        const localRetail = JSON.parse(localStorage.getItem('retail_orders') || '[]');
        const localBulk = JSON.parse(localStorage.getItem('bulk_orders') || '[]');
        const localApts = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
        
        setRetailOrders(localRetail.slice(-20).reverse());
        setWholesaleQueries(localBulk.slice(-20).reverse());
        setConsultations(localApts.slice(-20).reverse());
        
        setSyncStatus('mock');
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error syncing portal data:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  // Format Helper
  const renderStatus = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s.includes('confirm') || s.includes('complet')) return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/30">Confirmed</span>;
    if (s.includes('cancel')) return <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-500/30">Cancelled</span>;
    return <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/30">Pending</span>;
  };

  const renderActiveTable = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 w-full h-full min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing with Command Console...</p>
        </div>
      );
    }

    if (activeTab === 'retail') {
      if (retailOrders.length === 0) return <EmptyState tab="Retail Orders" />;
      return (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead className="bg-[#0A1020]">
              <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                <th className="p-4 font-bold rounded-tl-2xl">Timestamp</th>
                <th className="p-4 font-bold">Customer</th>
                <th className="p-4 font-bold">Contact</th>
                <th className="p-4 font-bold">Medicines (Est. Value)</th>
                <th className="p-4 font-bold">Total</th>
                <th className="p-4 font-bold rounded-tr-2xl">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#1E293B]/50">
              {retailOrders.map((order, i) => (
                <tr key={i} className="hover:bg-[#1E293B]/30 transition-colors">
                  <td className="p-4 text-xs text-slate-400">{order.timestamp || order.created_at}</td>
                  <td className="p-4 font-bold text-white">{order.customerName || order.name}</td>
                  <td className="p-4 text-slate-300">
                    <div>{order.phone}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{order.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="truncate max-w-[200px] text-slate-300" title={order.medicinesList || order.medicines}>
                      {order.medicinesList || order.medicines}
                    </div>
                    {order.estimatedMedicinesPrice && <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Est. {order.estimatedMedicinesPrice}</div>}
                  </td>
                  <td className="p-4 font-bold text-white">{order.totalEstimatedPrice || order.totalPrice || 'TBD'}</td>
                  <td className="p-4">{renderStatus(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'consultations') {
      if (consultations.length === 0) return <EmptyState tab="Consultations" />;
      return (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead className="bg-[#0A1020]">
              <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                <th className="p-4 font-bold rounded-tl-2xl">Timestamp</th>
                <th className="p-4 font-bold">Patient Name</th>
                <th className="p-4 font-bold">Phone Number</th>
                <th className="p-4 font-bold">Appointment Date</th>
                <th className="p-4 font-bold">Time Slot</th>
                <th className="p-4 font-bold rounded-tr-2xl">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#1E293B]/50">
              {consultations.map((apt, i) => (
                <tr key={i} className="hover:bg-[#1E293B]/30 transition-colors">
                  <td className="p-4 text-xs text-slate-400">{apt.timestamp || apt.created_at}</td>
                  <td className="p-4 font-bold text-white">{apt.patientName || apt.patient_name}</td>
                  <td className="p-4 text-slate-300">{apt.patientPhone || apt.patient_phone}</td>
                  <td className="p-4 text-slate-300 font-medium">{apt.appointmentDate || apt.appointment_date}</td>
                  <td className="p-4 text-white font-bold">{apt.timeSlot || apt.time_slot}</td>
                  <td className="p-4">{renderStatus(apt.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'wholesale') {
      if (wholesaleQueries.length === 0) return <EmptyState tab="Wholesale Queries" />;
      return (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead className="bg-[#0A1020]">
              <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                <th className="p-4 font-bold rounded-tl-2xl">Timestamp</th>
                <th className="p-4 font-bold">Company / Contact</th>
                <th className="p-4 font-bold">Contact Info</th>
                <th className="p-4 font-bold">Quantity</th>
                <th className="p-4 font-bold rounded-tr-2xl">Requirements</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#1E293B]/50">
              {wholesaleQueries.map((query, i) => (
                <tr key={i} className="hover:bg-[#1E293B]/30 transition-colors">
                  <td className="p-4 text-xs text-slate-400">{query.timestamp || query.created_at}</td>
                  <td className="p-4">
                    <div className="font-bold text-white">{query.companyName || query.company_name}</div>
                    <div className="text-[10px] text-slate-400">{query.contactName || query.name}</div>
                  </td>
                  <td className="p-4 text-slate-300">
                    <div>{query.phone}</div>
                    <div className="text-[10px] text-slate-500">{query.email}</div>
                  </td>
                  <td className="p-4 font-bold text-[#0F766E]">{query.estimatedQuantity || query.quantity}</td>
                  <td className="p-4">
                    <div className="truncate max-w-[250px] text-slate-300" title={query.requirements}>
                      {query.requirements}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const EmptyState = ({ tab }) => (
    <div className="flex flex-col items-center justify-center py-20 w-full min-h-[300px]">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">No {tab} Logged Yet</h3>
      <p className="text-xs text-slate-500 font-medium">Newly placed {tab.toLowerCase()} will appear here automatically. Only the latest 20 items are displayed.</p>
    </div>
  );

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
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Package className="w-3.5 h-3.5 text-amber-500"/> Orders <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{retailOrders.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Stethoscope className="w-3.5 h-3.5 text-blue-400"/> Consultations <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{consultations.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Briefcase className="w-3.5 h-3.5 text-purple-400"/> B2B Inquiries <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{wholesaleQueries.length}</span></span>
            </div>

            <button 
              onClick={fetchPortalData}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0F766E] text-[#2DD4BF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#0F766E]/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'mock' ? 'Mock Sync' : 'Sheets Sync'}
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Manage operational status, client orders, and wholesale inquiries.
              {syncStatus === 'mock' && (
                <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/20"><AlertCircle className="w-3 h-3"/> Local Mock Mode</span>
              )}
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
          <div className="flex items-center bg-[#111827] border border-[#1E293B] rounded-xl p-1.5 shadow-lg">
            <button 
              onClick={() => setActiveTab('retail')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'retail' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Package className={`w-4 h-4 ${activeTab === 'retail' ? 'text-white' : 'text-amber-500'}`} />
              Retail Orders ({retailOrders.length})
            </button>
            <button 
              onClick={() => setActiveTab('consultations')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'consultations' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Stethoscope className={`w-4 h-4 ${activeTab === 'consultations' ? 'text-white' : 'text-blue-400'}`} />
              Consultations ({consultations.length})
            </button>
            <button 
              onClick={() => setActiveTab('wholesale')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'wholesale' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Briefcase className={`w-4 h-4 ${activeTab === 'wholesale' ? 'text-white' : 'text-purple-400'}`} />
              Wholesale Queries ({wholesaleQueries.length})
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
              className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0F766E] transition-colors shadow-lg"
            />
          </div>
          <div className="relative">
            <select className="appearance-none bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-4 pr-10 text-sm text-white font-semibold focus:outline-none focus:border-[#0F766E] transition-colors cursor-pointer outline-none shadow-lg">
              <option>Show All Statuses</option>
              <option>Pending</option>
              <option>Confirmed</option>
              <option>Cancelled</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] hover:border-slate-500 rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg">
            <Download className="w-4 h-4 text-blue-400" />
            Export CSV
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-[#1E293B] rounded-2xl min-h-[300px] flex flex-col p-0 overflow-hidden relative z-10 shadow-2xl transition-all">
          {renderActiveTable()}
          {lastSync && !isLoading && (
            <div className="bg-[#0A1020] border-t border-[#1E293B] p-2 px-4 flex justify-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Last synced: {lastSync}
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
