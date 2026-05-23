import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, Loader2, ArrowLeft, XCircle, Trash2 } from 'lucide-react';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function MyBookings({ onBackToHome, initialAdminMode = false }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Cancel confirmation state
  const [cancellingId, setCancellingId] = useState(null);   // ID being cancelled
  const [confirmId, setConfirmId] = useState(null);         // ID waiting for confirm dialog
  const [cancelError, setCancelError] = useState('');

  // Clinic Administration Portal States
  const [isAdminMode, setIsAdminMode] = useState(initialAdminMode);
  const [adminTab, setAdminTab] = useState('orders'); // 'orders' | 'appointments' | 'b2b'
  const [allOrders, setAllOrders] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allB2BQueries, setAllB2BQueries] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [adminActionLoadingId, setAdminActionLoadingId] = useState(null);
  const [openOverride, setOpenOverride] = useState(localStorage.getItem('clinic_open_override') || 'auto');

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleToggleOverride = (val) => {
    localStorage.setItem('clinic_open_override', val);
    setOpenOverride(val);
    window.dispatchEvent(new Event('clinic-override-updated'));
  };

  useEffect(() => {
    setIsAdminMode(initialAdminMode);
    if (initialAdminMode) {
      fetchAdminData();
    }
  }, [initialAdminMode]);

  // Reset filters on tab switch
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('ALL');
  }, [adminTab]);

  // CSV Export Engine
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = '';

    if (adminTab === 'orders') {
      headers = ['Customer Name', 'Phone', 'Email', 'Address', 'Ordered Remedies', 'Total Price', 'Status', 'Ordered On'];
      rows = filteredOrders.map(o => [
        o.customer_name,
        o.phone,
        o.email,
        o.address?.replace(/"/g, '""'),
        o.medicines_list?.replace(/\n/g, ' | ').replace(/"/g, '""'),
        o.total_price,
        o.lead_status || 'Pending',
        o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : ''
      ]);
      filename = `Retail_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (adminTab === 'appointments') {
      headers = ['Patient Name', 'Patient Phone', 'Appointment Date', 'Time Slot', 'Status', 'Registered On'];
      rows = filteredAppointments.map(a => [
        a.patient_name,
        a.patient_phone,
        a.appointment_date,
        a.time_slot,
        a.status || (a.cancelled ? 'CANCELLED' : 'Booked'),
        a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : ''
      ]);
      filename = `Consultations_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (adminTab === 'b2b') {
      headers = ['Representative Name', 'Company Name', 'Phone', 'Email', 'Estimated Quantity', 'Requirements Specifications', 'Submitted On'];
      rows = filteredB2B.map(q => [
        q.client_name,
        q.company_name,
        q.phone,
        q.email,
        q.estimated_quantity,
        q.requirements_text?.replace(/\n/g, ' | ').replace(/"/g, '""'),
        q.created_at ? new Date(q.created_at).toLocaleString('en-IN') : ''
      ]);
      filename = `Wholesale_Queries_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Data Fetcher
  const fetchAdminData = async () => {
    setLoadingAdminData(true);
    try {
      let orders = [];
      let appointments = [];
      let b2bQueries = [];
      
      if (isFirebaseConfigured) {
        // Query Firestore for all retail orders
        const ordersSnapshot = await getDocs(collection(db, 'retail_orders'));
        ordersSnapshot.forEach((docSnap) => {
          orders.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Query Firestore for all clinic appointments
        const aptsSnapshot = await getDocs(collection(db, 'clinic_appointments'));
        aptsSnapshot.forEach((docSnap) => {
          appointments.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Query Firestore for all B2B queries
        const b2bSnapshot = await getDocs(collection(db, 'bulk_orders'));
        b2bSnapshot.forEach((docSnap) => {
          b2bQueries.push({ id: docSnap.id, ...docSnap.data() });
        });
      } else {
        orders = await mockDb.getAllRetailOrders();
        appointments = await mockDb.getAllAppointments();
        b2bQueries = await mockDb.getAllBulkOrders();
      }
      
      // Sort: newest first
      orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      // Sort appointments by appointment date descending
      appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

      // Sort B2B queries by created_at descending
      b2bQueries.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      setAllOrders(orders);
      setAllAppointments(appointments);
      setAllB2BQueries(b2bQueries);
    } catch (err) {
      console.error('Failed to load admin logs:', err);
    } finally {
      setLoadingAdminData(false);
    }
  };

  // Status updaters for Retail Orders
  const handleUpdateOrderStatus = async (order, newStatus) => {
    setAdminActionLoadingId(order.id);
    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'retail_orders', order.id), {
          lead_status: newStatus
        });
      } else {
        await mockDb.updateRetailOrderStatus(order.id, newStatus);
      }
      
      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_order_status',
          data: {
            phone: order.phone,
            timestamp: order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
            status: newStatus
          }
        })
      }).catch(e => console.error('Sheets status sync failed:', e));
      
      // Update local state immediately
      setAllOrders(prev => prev.map(ord => ord.id === order.id ? { ...ord, lead_status: newStatus } : ord));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // Status updaters for Appointments
  const handleUpdateAppointmentStatus = async (apt, newStatus) => {
    setAdminActionLoadingId(apt.id);
    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'clinic_appointments', apt.id), {
          status: newStatus,
          cancelled: newStatus === 'CANCELLED'
        });
      } else {
        await mockDb.updateAppointmentStatus(apt.id, newStatus);
      }
      
      // Sync with Google Sheets (fire-and-forget)
      if (newStatus === 'CANCELLED') {
        fetch('/api/updateSheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancel_appointment',
            data: {
              patient_phone: apt.patient_phone,
              appointment_date: apt.appointment_date,
              time_slot: apt.time_slot
            }
          })
        }).catch(e => console.error('Sheets cancel sync failed:', e));
      }
      
      // Update local state immediately
      setAllAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: newStatus, cancelled: newStatus === 'CANCELLED' } : a));
    } catch (err) {
      console.error('Failed to update appointment:', err);
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // Feature B: Search by phone number
  const handlePhoneSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResults(null);
    setCancelError('');

    const formattedSearch = searchPhone.trim();
    if (!formattedSearch) {
      setSearchError('Please enter a phone number to search.');
      return;
    }

    // Stealth passcode check for Clinic Administration mode
    if (formattedSearch.toLowerCase() === 'admin94313') {
      setIsAdminMode(true);
      fetchAdminData();
      setSearchPhone('');
      return;
    }

    setSearching(true);
    try {
      if (isFirebaseConfigured) {
        const appointmentsRef = collection(db, 'clinic_appointments');
        const q = query(appointmentsRef, where('patient_phone', '==', formattedSearch));
        const querySnapshot = await getDocs(q);

        const results = [];
        querySnapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() });
        });
        results.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        setSearchResults(results);
      } else {
        const results = await mockDb.getAppointmentsByPhone(formattedSearch);
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setSearchResults(results);
      }
    } catch (err) {
      console.error('Search query failure:', err);
      setSearchError('Failed to retrieve bookings. Please verify your connection.');
    } finally {
      setSearching(false);
    }
  };

  // Cancel appointment — marks CANCELLED in UI + Firestore + Google Sheets + localStorage
  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    setCancelError('');
    const booking = searchResults?.find((b) => b.id === bookingId);
    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'clinic_appointments', bookingId), {
          status: 'CANCELLED',
          cancelled: true
        });
      }
      
      // Mark as CANCELLED in Google Sheets (fire-and-forget)
      if (booking) {
        fetch('/api/updateSheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancel_appointment',
            data: {
              patient_phone: booking.patient_phone,
              appointment_date: booking.appointment_date,
              time_slot: booking.time_slot,
            }
          })
        }).catch((err) => console.warn('Sheets cancel sync failed:', err));
      }

      // Feature A & B: Update both localStorage caches for persistent state sync
      try {
        // 1. Global mock database cache
        const globalAppointments = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
        const updatedGlobal = globalAppointments.map((apt) => {
          if (apt.id === bookingId || (booking && apt.appointment_date === booking.appointment_date && apt.time_slot === booking.time_slot)) {
            return { ...apt, status: 'CANCELLED', cancelled: true };
          }
          return apt;
        });
        localStorage.setItem('clinic_appointments', JSON.stringify(updatedGlobal));

        // 2. User device-local bookings cache
        const localCache = JSON.parse(localStorage.getItem('user_local_bookings') || '[]');
        const updatedLocal = localCache.map((apt) => {
          if (apt.id === bookingId || (booking && apt.appointment_date === booking.appointment_date && apt.time_slot === booking.time_slot)) {
            return { ...apt, status: 'CANCELLED', cancelled: true };
          }
          return apt;
        });
        localStorage.setItem('user_local_bookings', JSON.stringify(updatedLocal));
      } catch (cacheErr) {
        console.error('Failed to update cancellation state in localStorage caches:', cacheErr);
      }

      // Keep card visible but flag it as cancelled — don't remove it
      setSearchResults((prev) =>
        prev ? prev.map((b) => b.id === bookingId ? { ...b, cancelled: true, status: 'CANCELLED' } : b) : prev
      );
      setConfirmId(null);
    } catch (err) {
      console.error('Cancel failed:', err);
      setCancelError('Failed to cancel appointment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const renderBookingCard = (booking) => {
    const isCancelled = booking.cancelled === true || booking.status === 'CANCELLED' || booking.status === 'Cancelled';
    const isCancelling = cancellingId === booking.id;
    const isAwaitingConfirm = confirmId === booking.id;
    const bookingId = booking.id;

    return (
      <div
        key={bookingId || `${booking.appointment_date}-${booking.time_slot}`}
        className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all duration-200 hover:shadow-md ${
          isCancelled ? 'border-slate-200 opacity-60 bg-slate-50/50' : 'border-[#EAE5DC]'
        }`}
      >
        {/* Top colour bar — grey if cancelled */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isCancelled ? 'bg-slate-300' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
        }`}></div>

        <div className="flex items-center justify-between border-b border-[#EAE5DC]/60 pb-3">
          <div className={`flex items-center gap-2 ${isCancelled ? 'text-slate-400' : 'text-emerald-700'}`}>
            <Calendar className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-emerald-600'}`} />
            <span className={`font-bold text-xs uppercase tracking-wider ${isCancelled ? 'line-through text-slate-400/80' : ''}`}>Appointment Pass</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
            isCancelled
              ? 'bg-slate-100 border-slate-200 text-slate-400 line-through'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {booking.status === 'Confirmed' ? 'Confirmed' : 'Booked'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <User className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>Patient Name</span>
                <span className={`font-bold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-900'}`}>{booking.patient_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>Registered Phone</span>
                <span className={`font-semibold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-800'}`}>{booking.patient_phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Calendar className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>Consultation Date</span>
                <span className={`font-bold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-900'}`}>
                  {new Date(booking.appointment_date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>Reserved Slot</span>
                <span className={`font-extrabold px-2 py-0.5 rounded border ${
                  isCancelled
                    ? 'line-through text-slate-400/80 bg-slate-100 border-slate-200'
                    : 'text-[#0F766E] bg-teal-50 border-teal-100'
                }`}>{booking.time_slot}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] leading-relaxed font-medium ${
          isCancelled ? 'text-slate-400 line-through' : 'text-slate-500'
        }`}>
          💡 <strong className={isCancelled ? 'line-through text-slate-400/80' : 'text-slate-600'}>Official Proof:</strong> Present this slip card at the clinic counter near Mahabir Chowk, Ranchi, on your appointment day. No email login or printed copy is required.
        </div>

        {/* Cancel Section — hidden if already cancelled */}
        {bookingId && !isCancelled && (
          <div className="pt-1">
            {cancelError && confirmId === bookingId && (
              <p className="text-[10px] text-rose-600 font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {cancelError}
              </p>
            )}

            {isAwaitingConfirm ? (
              // Confirmation prompt
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Cancel this appointment?
                </p>
                <p className="text-[10px] text-rose-500">This will free up the slot for others. This cannot be undone.</p>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancel(bookingId)}
                    className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isCancelling ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Cancelling...</>
                    ) : (
                      <><Trash2 className="w-3 h-3" /> Yes, Cancel</>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => { setConfirmId(null); setCancelError(''); }}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    Keep It
                  </button>
                </div>
              </div>
            ) : (
              // Cancel trigger button
              <button
                type="button"
                onClick={() => { setConfirmId(bookingId); setCancelError(''); }}
                className="w-full py-2 px-3 border border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Appointment
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Filtered Lists for Admin Dashboard
  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = 
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phone || '').includes(searchTerm) ||
      (order.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (order.lead_status || 'Pending').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const filteredAppointments = allAppointments.filter(apt => {
    const matchesSearch = 
      (apt.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.patient_phone || '').includes(searchTerm) ||
      (apt.time_slot || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'CANCELLED' && (apt.status === 'CANCELLED' || apt.cancelled)) ||
      (statusFilter === 'ACTIVE' && apt.status !== 'CANCELLED' && !apt.cancelled);
    return matchesSearch && matchesStatus;
  });

  const filteredB2B = allB2BQueries.filter(q => {
    const matchesSearch = 
      (q.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.phone || '').includes(searchTerm) ||
      (q.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.requirements_text || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // RENDER MAIN COMPONENT WITH SUBTABS
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 text-slate-800 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-[#115E59] hover:text-[#0D4F4A] hover:underline font-bold text-xs uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clinic Portal
        </button>
        <span className="text-2xs font-extrabold uppercase tracking-widest text-[#5A6561] bg-[#F9F6F0] border border-[#EAE5DC] px-3 py-1 rounded-full">
          {isAdminMode ? 'Pharmacist Logistics Portal' : 'Secure Proof Verification'}
        </span>
      </div>



      {isAdminMode ? (
        // --- ADMIN PORTAL BODY ---
        <div className="space-y-8">
          {/* Admin Title */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
              Kanchan <span className="text-[#115E59]">Pharmacist Portal</span>
            </h2>
            <p className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">
              Real-time Retail Orders &amp; Consultation Logistics Manager
            </p>
          </div>

          {/* Clinic Open Status Override Manager */}
          <div className="bg-white border border-[#EAE5DC] rounded-2xl p-5 shadow-sm space-y-4 max-w-2xl mx-auto text-left">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#EAE5DC]/60">
              <Clock className="w-5 h-5 text-[#115E59] shrink-0" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Clinic Operational Status Override</h3>
                <p className="text-[10px] text-slate-400">Force the clinic open/closed counter status displayed to visitors globally.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleToggleOverride('auto')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-2xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  openOverride === 'auto'
                    ? 'bg-[#115E59] border-[#115E59] text-white shadow-sm'
                    : 'bg-white border-[#EAE5DC] text-slate-500 hover:text-slate-800 hover:border-slate-400'
                }`}
              >
                ⏱️ Schedule Mode (Auto)
              </button>
              <button
                type="button"
                onClick={() => handleToggleOverride('open')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-2xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  openOverride === 'open'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-[#EAE5DC] text-slate-500 hover:text-emerald-700 hover:border-emerald-300'
                }`}
              >
                🟢 Force Always Open
              </button>
              <button
                type="button"
                onClick={() => handleToggleOverride('closed')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-2xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  openOverride === 'closed'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                    : 'bg-white border-[#EAE5DC] text-slate-500 hover:text-rose-700 hover:border-rose-300'
                }`}
              >
                🔴 Force Always Closed
              </button>
            </div>
          </div>

          {/* Tab Controls */}
          <div className="flex bg-[#F9F6F0] p-1.5 rounded-xl border border-[#EAE5DC] max-w-xl mx-auto shadow-sm">
            <button
              onClick={() => setAdminTab('orders')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
                adminTab === 'orders'
                  ? 'bg-[#115E59] text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📦 Retail Orders ({allOrders.length})
            </button>
            <button
              onClick={() => setAdminTab('appointments')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
                adminTab === 'appointments'
                  ? 'bg-[#115E59] text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📅 Consultations ({allAppointments.length})
            </button>
            <button
              onClick={() => setAdminTab('b2b')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
                adminTab === 'b2b'
                  ? 'bg-[#115E59] text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🏢 Wholesale Queries ({allB2BQueries.length})
            </button>
          </div>

          {/* Search & Filters Panel */}
          <div className="bg-[#F9F6F0] border border-[#EAE5DC] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 max-w-4xl mx-auto items-stretch md:items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  adminTab === 'orders' ? "Search orders by name, phone, or address..." :
                  adminTab === 'appointments' ? "Search appointments by patient name or phone..." :
                  "Search wholesale queries by name, company, email, or remedies..."
                }
                className="block w-full pl-10 pr-3 py-2 text-xs bg-white border border-[#EAE5DC] rounded-xl text-slate-900 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-[#115E59]/35 transition-all shadow-sm"
              />
            </div>

            {/* Status Dropdown Filter (Visible for Orders & Appointments) */}
            {adminTab !== 'b2b' && (
              <div className="w-full md:w-48 shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 text-xs bg-white border border-[#EAE5DC] rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#115E59]/35 transition-all shadow-sm font-semibold"
                >
                  <option value="ALL">📋 Show All Statuses</option>
                  {adminTab === 'orders' ? (
                    <>
                      <option value="PENDING">⏳ Pending Leads</option>
                      <option value="SHIPPED">🚚 Shipped Orders</option>
                      <option value="COMPLETED">✅ Completed Orders</option>
                      <option value="CANCELLED">❌ Cancelled Orders</option>
                    </>
                  ) : (
                    <>
                      <option value="ACTIVE">🟢 Active Bookings</option>
                      <option value="CANCELLED">🔴 Cancelled Bookings</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="py-2 px-4.5 bg-white border border-[#EAE5DC] hover:border-[#115E59] hover:text-[#115E59] text-slate-600 rounded-xl text-2xs font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              📥 Export CSV
            </button>
          </div>

          {/* Loading Spinner */}
          {loadingAdminData ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#115E59] animate-spin" />
              <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest">Synchronizing Database...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {adminTab === 'orders' ? (
                // Tab 1: Orders List
                filteredOrders.length === 0 ? (
                  <div className="p-12 bg-white border border-[#EAE5DC] rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-700">No Retail Orders Logged Yet</p>
                    <p className="text-xs text-slate-400">Newly placed retail orders will appear here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredOrders.map((order) => {
                      const isUpdating = adminActionLoadingId === order.id;
                      const status = order.lead_status || 'Pending';
                      
                      return (
                        <div key={order.id} className="bg-white border border-[#EAE5DC] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                          {/* Status top color bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            status === 'Completed' ? 'bg-emerald-500' :
                            status === 'Shipped' ? 'bg-amber-500' :
                            status === 'Cancelled' ? 'bg-rose-500' : 'bg-teal-500'
                          }`}></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-[#EAE5DC]/60 pb-2.5">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Customer Name</span>
                                <span className="font-extrabold text-slate-900 text-sm">{order.customer_name}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                status === 'Shipped' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                status === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                'bg-teal-50 border-teal-200 text-teal-700 animate-pulse'
                              }`}>
                                {status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Registered Phone</span>
                                <a href={`tel:${order.phone}`} className="font-bold text-[#115E59] hover:underline">{order.phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Ordered On</span>
                                <span className="font-semibold text-slate-700">
                                  {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Delivery Address</span>
                                <span className="font-semibold text-slate-800">{order.address}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Remedies Breakdown</span>
                                <div className="bg-[#F9F6F0]/40 border border-slate-100 rounded-lg p-2.5 font-mono text-[10px] text-slate-700 whitespace-pre-wrap leading-tight mt-1">
                                  {order.medicines_list}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Order Status Action Panel */}
                          <div className="border-t border-[#EAE5DC]/60 pt-4 mt-2 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                              <span>Total Price:</span>
                              <span className="text-[#115E59] text-sm">₹{order.total_price}</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Shipped')}
                                className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                🚚 Ship
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Completed')}
                                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                ✅ Complete
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Cancelled')}
                                className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : adminTab === 'appointments' ? (
                // Tab 2: Consultations List
                filteredAppointments.length === 0 ? (
                  <div className="p-12 bg-white border border-[#EAE5DC] rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-700">No Patient Appointments Scheduled</p>
                    <p className="text-xs text-slate-400">Newly booked consultation slots will appear here in real-time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAppointments.map((apt) => {
                      const isUpdating = adminActionLoadingId === apt.id;
                      const isCancelled = apt.status === 'CANCELLED' || apt.cancelled === true;
                      
                      return (
                        <div key={apt.id} className="bg-white border border-[#EAE5DC] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                          {/* Status color bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            isCancelled ? 'bg-rose-500' : 'bg-teal-500'
                          }`}></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-[#EAE5DC]/60 pb-2.5">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Patient Name</span>
                                <span className="font-extrabold text-slate-900 text-sm">{apt.patient_name}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isCancelled ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-teal-50 border-teal-200 text-teal-700'
                              }`}>
                                {isCancelled ? 'Cancelled' : 'Active'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Contact Phone</span>
                                <a href={`tel:${apt.patient_phone}`} className="font-bold text-[#115E59] hover:underline">{apt.patient_phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Consultation Date</span>
                                <span className="font-bold text-slate-800">{apt.appointment_date}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Time Slot</span>
                                <span className="font-extrabold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{apt.time_slot}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Registered On</span>
                                <span className="font-semibold text-slate-600">
                                  {apt.created_at ? new Date(apt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Consultation Status Panel */}
                          {!isCancelled && (
                            <div className="border-t border-[#EAE5DC]/60 pt-4 mt-2">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateAppointmentStatus(apt, 'CANCELLED')}
                                className="w-full py-2 px-3 border border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                ❌ Cancel Appointment Slot
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                // Tab 3: B2B Wholesale Queries List
                filteredB2B.length === 0 ? (
                  <div className="p-12 bg-white border border-[#EAE5DC] rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-700">No Wholesale Inquiries Logged Yet</p>
                    <p className="text-xs text-slate-400">Newly submitted B2B distribution queries will appear here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredB2B.map((query) => {
                      return (
                        <div key={query.id || `${query.created_at}`} className="bg-white border border-[#EAE5DC] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between text-left">
                          {/* Top accent bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-[#EAE5DC]/60 pb-2.5">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Representative Name</span>
                                <span className="font-extrabold text-slate-900 text-sm">{query.client_name}</span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-teal-50 border-teal-200 text-teal-700">
                                B2B Inquiry
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Company Name</span>
                                <span className="font-bold text-slate-800">{query.company_name}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Submitted On</span>
                                <span className="font-semibold text-slate-700">
                                  {query.created_at ? new Date(query.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Contact Phone</span>
                                <a href={`tel:${query.phone}`} className="font-bold text-[#115E59] hover:underline">{query.phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Contact Email</span>
                                <a href={`mailto:${query.email}`} className="font-bold text-[#115E59] hover:underline break-all">{query.email}</a>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Estimated Required Volume</span>
                                <span className="font-extrabold text-slate-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 text-[10px] inline-block mt-0.5">{query.estimated_quantity} Units</span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Remedy Requirements</span>
                                <div className="bg-[#F9F6F0]/40 border border-slate-100 rounded-lg p-2.5 font-mono text-[10px] text-slate-700 whitespace-pre-wrap leading-tight mt-1">
                                  {query.requirements_text}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        // --- LOOKUP MODE BODY ---
        <div className="space-y-12 animate-fade-in">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Active Appointments</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Look up your bookings by phone number to view proof or cancel your appointment.
            </p>
          </div>

          {/* Phone Lookup card */}
          <div className="max-w-xl mx-auto bg-white border border-[#EAE5DC] rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#115E59]"></div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4 text-[#115E59]" />
                Phone Number Lookup
              </h3>
              <p className="text-2xs text-slate-400">Enter your registered phone number to find and manage your appointments.</p>
            </div>

            <form onSubmit={handlePhoneSearch} className="space-y-4">
              <div>
                <label htmlFor="lookup-phone" className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Registered Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    id="lookup-phone"
                    value={searchPhone}
                    onChange={(e) => {
                      setSearchPhone(e.target.value);
                      if (searchError) setSearchError('');
                    }}
                    placeholder="e.g. 9431360455"
                    className="block w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 focus:border-[#115E59] transition-all shadow-sm"
                  />
                </div>
              </div>

              {searchError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-2xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={searching}
                className="w-full btn-neon-emerald py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Searching Records...</>
                ) : (
                  <><Search className="w-4 h-4" />Find My Appointments</>
                )}
              </button>
            </form>

            {/* Search Results */}
            {searchResults !== null && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-2xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {searchResults.length === 0 ? 'No appointments found' : `${searchResults.length} appointment${searchResults.length > 1 ? 's' : ''} found`}
                </h4>

                {searchResults.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">No Appointments Found</p>
                    <p className="text-3xs text-slate-400">Verify the phone number or try booking a new slot.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {searchResults.map(renderBookingCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
