import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, User, Phone, AlertCircle, Loader2, ArrowLeft, XCircle, Trash2, Lock, Package, Copy, CalendarPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

const safeDateString = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString();
  return dateVal;
};

export default function MyBookings({ onBackToHome, initialAdminMode = false, onlyShowType = null }) {
  const { language, t } = useLanguage();
  const [searchPhone, setSearchPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchOrderResults, setSearchOrderResults] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Cancel confirmation state
  const [cancellingId, setCancellingId] = useState(null);   // ID being cancelled
  const [confirmId, setConfirmId] = useState(null);         // ID waiting for confirm dialog
  const [cancelError, setCancelError] = useState('');

  // Clinic Administration Portal States
  const [isAdminMode, setIsAdminMode] = useState(initialAdminMode);
  const [prevInitialAdminMode, setPrevInitialAdminMode] = useState(initialAdminMode);
  if (initialAdminMode !== prevInitialAdminMode) {
    setIsAdminMode(initialAdminMode);
    setPrevInitialAdminMode(initialAdminMode);
  }
  const [adminTab, setAdminTab] = useState('orders'); // 'orders' | 'appointments' | 'b2b'
  const [allOrders, setAllOrders] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allB2BQueries, setAllB2BQueries] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [adminActionLoadingId, setAdminActionLoadingId] = useState(null);
  const [openOverride, setOpenOverride] = useState(localStorage.getItem('clinic_open_override') || 'auto');

  // Secure Password States
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pharmacist_authorized') === 'true';
    }
    return false;
  });
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'Vikhyat@2012') {
      setIsAuthenticated(true);
      sessionStorage.setItem('pharmacist_authorized', 'true');
      setPasswordError('');
      fetchAdminData();
    } else {
      setPasswordError(language === 'en' ? 'Invalid security credentials. Access denied.' : 'अमान्य सुरक्षा प्रमाण पत्र। पहुंच अस्वीकृत।');
    }
  };

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleToggleOverride = (val) => {
    localStorage.setItem('clinic_open_override', val);
    setOpenOverride(val);
    window.dispatchEvent(new Event('clinic-override-updated'));
  };

  const handleTabChange = (tab) => {
    setAdminTab(tab);
    setSearchTerm('');
    setStatusFilter('ALL');
  };

  useEffect(() => {
    if (isAdminMode && isAuthenticated) {
      fetchAdminData();
      const interval = setInterval(() => {
        fetchAdminData(true);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAdminMode, isAuthenticated]);

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
        o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
      ]);
      filename = `Retail_Orders_${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-')}.csv`;
    } else if (adminTab === 'appointments') {
      headers = ['Patient Name', 'Patient Phone', 'Appointment Date', 'Time Slot', 'Status', 'Registered On'];
      rows = filteredAppointments.map(a => [
        a.patient_name,
        a.patient_phone,
        a.appointment_date,
        a.time_slot,
        a.status || (a.cancelled ? 'CANCELLED' : 'Booked'),
        a.created_at ? new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
      ]);
      filename = `Consultations_${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-')}.csv`;
    } else if (adminTab === 'b2b') {
      headers = ['Representative Name', 'Company Name', 'Phone', 'Email', 'Estimated Quantity', 'Requirements Specifications', 'Submitted On'];
      rows = filteredB2B.map(q => [
        q.client_name,
        q.company_name,
        q.phone,
        q.email,
        q.estimated_quantity,
        q.requirements_text?.replace(/\n/g, ' | ').replace(/"/g, '""'),
        q.created_at ? new Date(q.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
      ]);
      filename = `Wholesale_Queries_${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }).split(',')[0].replace(/\//g, '-')}.csv`;
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
  async function fetchAdminData(isAutoRefresh = false) {
    if (!isAutoRefresh) setLoadingAdminData(true);
    try {
      let orders = [];
      let appointments = [];
      let b2bQueries = [];
      let fetchedSuccessfully = false;
      
      if (isFirebaseConfigured) {
        try {
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
          
          fetchedSuccessfully = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore admin load failed, attempting Google Sheets / mockDb fallback:", firestoreErr);
        }
      }
      
      if (!fetchedSuccessfully) {
        try {
          const response = await fetch('/api/readSheets');
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            orders = result.data.retailOrders || [];
            appointments = result.data.appointments || [];
            b2bQueries = result.data.b2bQueries || [];
            fetchedSuccessfully = true;
          }
        } catch (sheetErr) {
          console.warn("⚠️ Google Sheets fallback failed for admin logs:", sheetErr);
        }
      }

      if (!fetchedSuccessfully) {
        orders = await mockDb.getAllRetailOrders();
        appointments = await mockDb.getAllAppointments();
        b2bQueries = await mockDb.getAllBulkOrders();
      }

      // Normalize fields so MyBookings table/cards render cleanly in both modes!
      const normalizedOrders = orders.map(o => ({
        id: o.id,
        phone: o.phone || '',
        email: o.email || '',
        address: o.address || '',
        customer_name: o.customer_name || o.customerName || o.name || '',
        medicines_list: o.medicines_list || o.medicinesList || o.medicines || '',
        total_price: o.total_price || o.totalEstimatedPrice || o.totalPrice || 'TBD',
        lead_status: o.lead_status || o.status || 'Pending',
        created_at: safeDateString(o.created_at || o.timestamp)
      }));

      const normalizedApts = appointments.map(a => ({
        id: a.id,
        patient_name: a.patient_name || a.patientName || '',
        patient_phone: a.patient_phone || a.patientPhone || '',
        appointment_date: a.appointment_date || a.appointmentDate || '',
        time_slot: a.time_slot || a.timeSlot || '',
        status: a.status || (a.cancelled ? 'CANCELLED' : 'Pending'),
        cancelled: a.cancelled || a.status === 'CANCELLED',
        created_at: safeDateString(a.created_at || a.timestamp)
      }));

      const normalizedBulk = b2bQueries.map(q => ({
        id: q.id,
        client_name: q.client_name || q.contactName || q.name || '',
        company_name: q.company_name || q.companyName || '',
        phone: q.phone || '',
        email: q.email || '',
        estimated_quantity: q.estimated_quantity || q.estimatedQuantity || q.quantity || '',
        requirements_text: q.requirements_text || q.requirements || '',
        created_at: safeDateString(q.created_at || q.timestamp)
      }));
      
      // Sort: newest first
      normalizedOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      normalizedApts.sort((a, b) => new Date(b.appointment_date || 0) - new Date(a.appointment_date || 0));
      normalizedBulk.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      setAllOrders(normalizedOrders);
      setAllAppointments(normalizedApts);
      setAllB2BQueries(normalizedBulk);
    } catch (err) {
      console.error('Failed to load admin logs:', err);
    } finally {
      setLoadingAdminData(false);
    }
  }

  // Status updaters for Retail Orders
  const handleUpdateOrderStatus = async (order, newStatus) => {
    setAdminActionLoadingId(order.id);
    // Optimistic Update
    setAllOrders(prev => prev.map(ord => ord.id === order.id ? { ...ord, lead_status: newStatus, status: newStatus } : ord));
    
    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !order.id.startsWith('Retail_Orders_')) {
        try {
          await updateDoc(doc(db, 'retail_orders', order.id), {
            lead_status: newStatus,
            status: newStatus
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore update failed in MyBookings, falling back to mockDb:", firestoreErr);
        }
      }
      
      if (!docUpdated) {
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
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // Price updaters for Retail Orders
  const handleUpdateOrderPrice = async (order, newPrice) => {
    if ((order.total_price || '').trim() === (newPrice || '').trim()) return;
    setAdminActionLoadingId(order.id);
    
    // Optimistic Update
    setAllOrders(prev => prev.map(ord => ord.id === order.id ? { ...ord, total_price: newPrice } : ord));
    
    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !order.id.startsWith('Retail_Orders_')) {
        try {
          await updateDoc(doc(db, 'retail_orders', order.id), {
            total_price: newPrice
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore price update failed in MyBookings, falling back to mockDb:", firestoreErr);
        }
      }
      
      if (!docUpdated) {
        await mockDb.updateRetailOrderPrice(order.id, newPrice);
      }
      
      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_order_price',
          data: {
            phone: order.phone,
            timestamp: order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
            price: newPrice
          }
        })
      }).catch(e => console.error('Sheets price sync failed:', e));
    } catch (err) {
      console.error('Failed to update price:', err);
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // Status updaters for Appointments
  const handleUpdateAppointmentStatus = async (apt, newStatus) => {
    setAdminActionLoadingId(apt.id);
    // Optimistic Update
    setAllAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: newStatus, cancelled: newStatus === 'CANCELLED' } : a));

    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !apt.id.startsWith('Appointments_')) {
        try {
          await updateDoc(doc(db, 'clinic_appointments', apt.id), {
            status: newStatus,
            cancelled: newStatus === 'CANCELLED'
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore appointment update failed in MyBookings, falling back to mockDb:", firestoreErr);
        }
      }
      
      if (!docUpdated) {
        await mockDb.updateAppointmentStatus(apt.id, newStatus);
      }
      
      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_appointment_status',
          data: {
            patient_name: apt.patient_name || apt.patientName,
            patient_phone: apt.patient_phone || apt.patientPhone,
            appointment_date: apt.appointment_date || apt.appointmentDate,
            time_slot: apt.time_slot || apt.timeSlot,
            status: newStatus
          }
        })
      }).catch(e => console.error('Sheets status sync failed:', e));
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
    setSearchOrderResults(null);
    setCancelError('');

    const formattedSearch = searchPhone.trim();
    if (!formattedSearch) {
      setSearchError(language === 'en' ? 'Please enter a phone number to search.' : 'कृपया खोजने के लिए फोन नंबर दर्ज करें।');
      return;
    }

    // Stealth passcode check for Clinic Administration mode
    if (formattedSearch.toLowerCase() === 'admin94313') {
      setIsAdminMode(true);
      setIsAuthenticated(true);
      sessionStorage.setItem('pharmacist_authorized', 'true');
      fetchAdminData();
      setSearchPhone('');
      return;
    }

    setSearching(true);
    try {
      let apptResults = [];
      let orderResults = [];
      let fetchedSuccessfully = false;

      if (isFirebaseConfigured) {
        try {
          if (!onlyShowType || onlyShowType === 'appointments') {
            // Query Firestore for appointments
            const appointmentsRef = collection(db, 'clinic_appointments');
            const q1 = query(appointmentsRef, where('patient_phone', '==', formattedSearch));
            const querySnapshot = await getDocs(q1);
            querySnapshot.forEach((docSnap) => {
              apptResults.push({ id: docSnap.id, ...docSnap.data() });
            });
            apptResults.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
          }

          if (!onlyShowType || onlyShowType === 'orders') {
            // Query Firestore for B2C retail orders
            const ordersRef = collection(db, 'retail_orders');
            const q2 = query(ordersRef, where('phone', '==', formattedSearch));
            const ordersSnapshot = await getDocs(q2);
            ordersSnapshot.forEach((docSnap) => {
              orderResults.push({ id: docSnap.id, ...docSnap.data() });
            });
            orderResults.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          }
          
          fetchedSuccessfully = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore phone query failed, attempting Google Sheets / mockDb fallback:", firestoreErr);
        }
      }

      if (!fetchedSuccessfully) {
        try {
          const response = await fetch('/api/readSheets');
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            const cleanSearch = formattedSearch.replace(/[^0-9]/g, '');
            
            if (!onlyShowType || onlyShowType === 'appointments') {
              apptResults = (result.data.appointments || []).filter(apt => {
                const phone = (apt.patientPhone || apt.patient_phone || '').replace(/[^0-9]/g, '');
                if (!phone) return false;
                return phone.includes(cleanSearch) || cleanSearch.includes(phone);
              }).map(apt => ({
                id: apt.id,
                patient_name: apt.patientName || apt.patient_name,
                patient_phone: apt.patientPhone || apt.patient_phone,
                appointment_date: apt.appointmentDate || apt.appointment_date,
                time_slot: apt.timeSlot || apt.time_slot,
                status: apt.status,
                created_at: apt.timestamp || apt.created_at || ''
              }));
            }

            if (!onlyShowType || onlyShowType === 'orders') {
              orderResults = (result.data.retailOrders || []).filter(order => {
                const phone = (order.phone || '').replace(/[^0-9]/g, '');
                if (!phone) return false;
                return phone.includes(cleanSearch) || cleanSearch.includes(phone);
              }).map(order => ({
                id: order.id,
                customer_name: order.customerName || order.name,
                phone: order.phone,
                email: order.email,
                address: order.address,
                medicines_list: order.medicinesList || order.medicines,
                total_price: order.totalEstimatedPrice || order.totalPrice,
                lead_status: order.status || order.lead_status || 'Pending',
                created_at: order.timestamp || order.created_at || ''
              }));
            }
            
            fetchedSuccessfully = true;
          }
        } catch (sheetErr) {
          console.warn("⚠️ Google Sheets search fallback failed:", sheetErr);
        }
      }

      if (!fetchedSuccessfully || (apptResults.length === 0 && orderResults.length === 0)) {
        // Safe fallback to mockDb
        const mockApts = (!onlyShowType || onlyShowType === 'appointments') ? await mockDb.getAppointmentsByPhone(formattedSearch) : [];
        const mockOrders = (!onlyShowType || onlyShowType === 'orders') ? await mockDb.getRetailOrdersByPhone(formattedSearch) : [];
        
        // Merge with existing array (ensures local device caching fits together)
        const combinedApts = [...apptResults];
        mockApts.forEach(ma => {
          if (!combinedApts.some(a => a.id === ma.id)) combinedApts.push(ma);
        });

        const combinedOrders = [...orderResults];
        mockOrders.forEach(mo => {
          if (!combinedOrders.some(o => o.id === mo.id)) combinedOrders.push(mo);
        });

        apptResults = combinedApts;
        orderResults = combinedOrders;
      }

      // Final normalizations to ensure visual columns match perfectly
      const normalizedApts = apptResults.map(a => ({
        id: a.id,
        patient_name: a.patient_name || a.patientName || '',
        patient_phone: a.patient_phone || a.patientPhone || '',
        appointment_date: a.appointment_date || a.appointmentDate || '',
        time_slot: a.time_slot || a.timeSlot || '',
        status: a.status || (a.cancelled ? 'CANCELLED' : 'Pending'),
        cancelled: a.cancelled || a.status === 'CANCELLED',
        created_at: safeDateString(a.created_at || a.timestamp)
      }));

      const normalizedOrders = orderResults.map(o => ({
        id: o.id,
        phone: o.phone || '',
        email: o.email || '',
        address: o.address || '',
        customer_name: o.customer_name || o.customerName || o.name || '',
        medicines_list: o.medicines_list || o.medicinesList || o.medicines || '',
        total_price: o.total_price || o.totalEstimatedPrice || o.totalPrice || 'TBD',
        lead_status: o.lead_status || o.status || 'Pending',
        created_at: safeDateString(o.created_at || o.timestamp)
      }));

      // Sort
      normalizedApts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
      normalizedOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setSearchResults(normalizedApts);
      setSearchOrderResults(normalizedOrders);
    } catch (err) {
      console.error('Search query failure:', err);
      setSearchError(language === 'en' ? 'Failed to retrieve records. Please verify your connection.' : 'रिकॉर्ड प्राप्त करने में विफल। कृपया अपने इंटरनेट कनेक्शन की जांच करें।');
    } finally {
      setSearching(false);
    }
  };

  // Cancel appointment — marks CANCELLED in UI + Firestore + Google Sheets + localStorage
  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    setCancelError('');
    const booking = searchResults?.find((b) => b.id === bookingId);

    // Optimistic Update
    setSearchResults((prev) =>
      prev ? prev.map((b) => b.id === bookingId ? { ...b, cancelled: true, status: 'CANCELLED' } : b) : prev
    );

    try {
      if (isFirebaseConfigured && !bookingId.startsWith('Appointments_')) {
        try {
          await updateDoc(doc(db, 'clinic_appointments', bookingId), {
            status: 'CANCELLED',
            cancelled: true
          });
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore cancellation failed, falling back to mockDb:", firestoreErr);
        }
      }
      
      // Always update mockDb/localStorage to stay synced
      await mockDb.updateAppointmentStatus(bookingId, 'CANCELLED');

      // Mark as CANCELLED in Google Sheets (fire-and-forget)
      if (booking) {
        fetch('/api/updateSheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancel_appointment',
            data: {
              patient_phone: booking.patient_phone || booking.patientPhone,
              appointment_date: booking.appointment_date || booking.appointmentDate,
              time_slot: booking.time_slot || booking.timeSlot,
            }
          })
        }).catch((err) => console.warn('Sheets cancel sync failed:', err));
      }

      // Feature A & B: Update both localStorage caches for persistent state sync
      try {
        // 1. Global mock database cache
        const globalAppointments = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
        const updatedGlobal = globalAppointments.map((apt) => {
          if (apt.id === bookingId || (booking && (apt.appointment_date === booking.appointment_date || apt.appointmentDate === booking.appointmentDate) && (apt.time_slot === booking.time_slot || apt.timeSlot === booking.timeSlot))) {
            return { ...apt, status: 'CANCELLED', cancelled: true };
          }
          return apt;
        });
        localStorage.setItem('clinic_appointments', JSON.stringify(updatedGlobal));

        // 2. User device-local bookings cache
        const localCache = JSON.parse(localStorage.getItem('user_local_bookings') || '[]');
        const updatedLocal = localCache.map((apt) => {
          if (apt.id === bookingId || (booking && (apt.appointment_date === booking.appointment_date || apt.appointmentDate === booking.appointmentDate) && (apt.time_slot === booking.time_slot || apt.timeSlot === booking.timeSlot))) {
            return { ...apt, status: 'CANCELLED', cancelled: true };
          }
          return apt;
        });
        localStorage.setItem('user_local_bookings', JSON.stringify(updatedLocal));
      } catch (cacheErr) {
        console.error('Failed to update cancellation state in localStorage caches:', cacheErr);
      }

      setConfirmId(null);
    } catch (err) {
      console.error('Cancel failed:', err);
      setCancelError('Failed to cancel appointment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCopyDetails = (booking) => {
    const details = `Appointment at Kanchan Homoeo Hall\nPatient: ${booking.patient_name}\nDate: ${new Date(booking.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${booking.time_slot}`;
    navigator.clipboard.writeText(details);
    toast.success(language === 'en' ? 'Appointment details copied!' : 'अपॉइंटमेंट विवरण कॉपी किया गया!');
  };

  const handleAddToCalendar = (booking) => {
    const dateStr = booking.appointment_date;
    const timeSlot = booking.time_slot;
    
    const startTimeMatch = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let startHour = 10;
    let startMin = 0;
    if (startTimeMatch) {
      let h = parseInt(startTimeMatch[1], 10);
      const m = parseInt(startTimeMatch[2], 10);
      const ampm = startTimeMatch[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      startHour = h;
      startMin = m;
    }

    const startDate = new Date(dateStr);
    startDate.setHours(startHour, startMin, 0);
    const endDate = new Date(startDate.getTime() + 30 * 60000);

    const formatICSDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kanchan Homoeo Hall//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:Clinic Appointment - ${booking.patient_name}`,
      `DESCRIPTION:Appointment at Kanchan Homoeo Hall. Keep your slip token handy.`,
      `LOCATION:Kanchan Homoeo Hall, near Mahabir Chowk, Ranchi`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Appointment_${booking.patient_name.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(language === 'en' ? 'Downloaded Calendar Invite' : 'कैलेंडर आमंत्रण डाउनलोड किया गया');
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
            <span className={`font-bold text-xs uppercase tracking-wider ${isCancelled ? 'line-through text-slate-400/80' : ''}`}>
              {language === 'en' ? 'Appointment Pass' : 'अपॉइंटमेंट पर्ची'}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
            isCancelled
              ? 'bg-slate-100 border-slate-200 text-slate-400 line-through'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {booking.status === 'Confirmed' ? (language === 'en' ? 'Confirmed' : 'पुष्ट') : (language === 'en' ? 'Booked' : 'बुक किया गया')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <User className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>{t('calendar.patient')}</span>
                <span className={`font-bold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-900'}`}>{booking.patient_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>{language === 'en' ? 'Registered Phone' : 'पंजीकृत फोन'}</span>
                <span className={`font-semibold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-800'}`}>{booking.patient_phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Calendar className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>{t('calendar.date')}</span>
                <span className={`font-bold ${isCancelled ? 'line-through text-slate-400/80' : 'text-slate-900'}`}>
                  {new Date(booking.appointment_date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata'
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className={`w-4 h-4 shrink-0 ${isCancelled ? 'text-slate-300' : 'text-slate-400'}`} />
              <div>
                <span className={`block text-[9px] uppercase tracking-wider font-bold ${isCancelled ? 'line-through text-slate-400/70' : 'text-slate-400'}`}>{t('calendar.slot')}</span>
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
          💡 <strong className={isCancelled ? 'line-through text-slate-400/80' : 'text-slate-600'}>
            {language === 'en' ? 'Official Proof:' : 'आधिकारिक प्रमाण:'}
          </strong>{' '}
          {language === 'en' 
            ? 'Present this slip card at the clinic counter near Mahabir Chowk, Ranchi, on your appointment day. No email login or printed copy is required.'
            : 'अपने अपॉइंटमेंट के दिन महावीर चौक, रांची के पास क्लिनिक काउंटर पर यह पर्ची कार्ड प्रस्तुत करें। कोई ईमेल लॉगिन या मुद्रित प्रति की आवश्यकता नहीं है।'}
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
                  {language === 'en' ? 'Cancel this appointment?' : 'क्या यह अपॉइंटमेंट रद्द करें?'}
                </p>
                <p className="text-[10px] text-rose-500">
                  {language === 'en' 
                    ? 'This will free up the slot for others. This cannot be undone.'
                    : 'यह दूसरों के लिए स्लॉट खाली कर देगा। इसे वापस नहीं लिया जा सकता।'}
                </p>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancel(bookingId)}
                    className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isCancelling ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> {language === 'en' ? 'Cancelling...' : 'रद्द किया जा रहा है...'}</>
                    ) : (
                      <><Trash2 className="w-3 h-3" /> {language === 'en' ? 'Yes, Cancel' : 'हाँ, रद्द करें'}</>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => { setConfirmId(null); setCancelError(''); }}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    {language === 'en' ? 'Keep It' : 'सुरक्षित रखें'}
                  </button>
                </div>
              </div>
            ) : (
              // Cancel & Actions
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(booking)}
                    className="flex-1 py-2 px-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Copy Token' : 'कॉपी करें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddToCalendar(booking)}
                    className="flex-1 py-2 px-3 border border-[#EAE5DC] hover:border-teal-300 hover:bg-teal-50 text-teal-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Calendar' : 'कैलेंडर'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setConfirmId(bookingId); setCancelError(''); }}
                  className="w-full py-2 px-3 border border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Cancel Appointment' : 'अपॉइंटमेंट रद्द करें'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderOrderCard = (order) => {
    const status = order.lead_status || order.status || 'Pending';
    const isCancelled = status.toLowerCase() === 'cancelled';
    const isOutOfStock = status.toLowerCase().includes('out of stock');
    const isOutForDelivery = status.toLowerCase().includes('out for delivery');
    const isDelivered = (status.toLowerCase().includes('deliver') && !isOutForDelivery) || status.toLowerCase().includes('complet');

    return (
      <div
        key={order.id || `${order.created_at}`}
        className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all duration-200 hover:shadow-md ${
          isCancelled ? 'border-slate-200 opacity-60 bg-slate-50/50' : 'border-[#EAE5DC]'
        }`}
      >
        {/* Top colour bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isCancelled ? 'bg-rose-500' :
          isOutOfStock ? 'bg-orange-500' :
          isDelivered ? 'bg-emerald-500' :
          isOutForDelivery ? 'bg-amber-500' : 'bg-teal-500'
        }`}></div>

        <div className="flex items-center justify-between border-b border-[#EAE5DC]/60 pb-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Package className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-550 select-none">
              {language === 'en' ? 'Remedies Delivery' : 'दवा होम डिलीवरी'}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
            isCancelled ? 'bg-rose-50 border-rose-200 text-rose-700' :
            isOutOfStock ? 'bg-orange-50 border-orange-200 text-orange-700' :
            isDelivered ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            isOutForDelivery ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-teal-50 border-teal-200 text-teal-700 animate-pulse'
          }`}>
            {isCancelled ? (language === 'en' ? 'Cancelled' : 'रद्द') :
             isOutOfStock ? (language === 'en' ? 'Out of Stock' : 'स्टॉक में नहीं') :
             isDelivered ? (language === 'en' ? 'Delivered' : 'डिलिवर हो गया') :
             isOutForDelivery ? (language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर') :
             (language === 'en' ? 'Booked' : 'बुक किया गया')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Customer Name' : 'ग्राहक का नाम'}</span>
                <span className="font-bold text-slate-900">{order.customer_name || order.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Contact Phone' : 'संपर्क फोन'}</span>
                <span className="font-semibold text-slate-800">{order.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Ordered On' : 'ऑर्डर की तिथि'}</span>
                <span className="font-semibold text-slate-800">
                  {order.created_at ? new Date(order.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
                  }) : 'Unknown'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-600">
              <span className="w-4 text-slate-400 font-bold shrink-0 text-center">₹</span>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Total Price' : 'कुल मूल्य'}</span>
                <span className="font-extrabold text-[#0F766E]">₹{order.total_price || order.totalEstimatedPrice}</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-1">
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Delivery Address' : 'डिलिवरी का पता'}</span>
            <span className="font-medium text-slate-700 block bg-slate-50 p-2 rounded-lg border border-slate-100">{order.address}</span>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-1">
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">{language === 'en' ? 'Remedies Ordered' : 'ऑर्डर की गई दवाएं'}</span>
            <div className="text-slate-800 font-sans text-xs whitespace-pre-wrap leading-relaxed mt-1 pl-1 font-semibold">
              {order.medicines_list || order.medicines}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] leading-relaxed font-medium text-slate-500">
          💡 <strong>{language === 'en' ? 'Delivery Update:' : 'डिलिवरी अपडेट:'}</strong>{' '}
          {isDelivered 
            ? (language === 'en' ? 'Your homeopathic dilutions have been successfully delivered to your Ranchi address.' : 'आपकी होम्योपैथिक दवाएं आपके रांची के पते पर सफलतापूर्वक वितरित कर दी गई हैं।')
            : isOutForDelivery 
            ? (language === 'en' ? 'Remedies are with our courier agent and out for delivery in Ranchi city limits.' : 'दवाएं हमारे कूरियर एजेंट के साथ हैं और रांची शहर में वितरण के लिए बाहर निकली हैं।')
            : (language === 'en' ? 'Order booked successfully. Sourcing remedies at our Upper Bazar pharmacy counter.' : 'ऑर्डर सफलतापूर्वक बुक हो गया। हमारे अपर बाजार फार्मेसी काउंटर पर दवाएं तैयार की जा रही हैं।')}
        </div>
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

  // --- DETACHED SECURE LOCK SCREEN (DARK THEME) ---
  if (isAdminMode && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden animate-fade-in font-sans">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Smaller, subtle return link */}
        <button
          type="button"
          onClick={onBackToHome}
          className="absolute top-6 left-6 text-slate-500 hover:text-slate-350 text-3xs font-extrabold uppercase tracking-widest transition-colors cursor-pointer select-none"
        >
          {language === 'en' ? '← Return to Clinic' : '← क्लिनिक पर वापस जाएं'}
        </button>

        {/* Secure login card */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-left space-y-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>

          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-[#2DD4BF] mb-1.5 shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight uppercase font-display">
              {language === 'en' ? 'Protected Admin Space' : 'सुरक्षित व्यवस्थापक क्षेत्र'}
            </h3>
            <p className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">
              {language === 'en' ? 'Authorization Required for Database Logs' : 'डेटाबेस लॉग के लिए प्राधिकरण आवश्यक है'}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                {language === 'en' ? 'Enter Security Key' : 'सुरक्षा कुंजी दर्ज करें'}
              </label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••••••••"
                className="block w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all shadow-sm font-mono text-center tracking-widest"
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-350 text-2xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-neon-emerald py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all border-0"
            >
              {language === 'en' ? 'Unlock Dashboard' : 'डैशबोर्ड अनलॉक करें'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DETACHED DARK ADMIN TERMINAL LAYOUT (DARK THEME) ---
  if (isAdminMode && isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans animate-fade-in relative z-0 pb-16">
        {/* Full-width techy admin header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
            {/* Console Branding */}
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-[#115E59] flex items-center justify-center text-white shadow-lg shadow-teal-500/10">
                <Lock className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="font-display font-black text-sm sm:text-base tracking-widest text-white uppercase flex items-center gap-1.5">
                  KHH <span className="text-teal-400 font-extrabold">{language === 'en' ? 'PHARMACIST PORTAL' : 'फार्मासिस्ट पोर्टल'}</span>
                </span>
                <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-400 -mt-0.5">
                  {t('portal.adminPortal')}
                </span>
              </div>
            </div>

            {/* Admin Stats & Metrics Bar */}
            <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <span className="px-3 py-1 bg-slate-800 border border-slate-700/55 rounded-full flex items-center gap-1.5">
                📦 {language === 'en' ? 'Orders' : 'ऑर्डर'} <strong className="text-teal-450">{allOrders.length}</strong>
              </span>
              <span className="px-3 py-1 bg-slate-800 border border-slate-700/55 rounded-full flex items-center gap-1.5">
                📅 {language === 'en' ? 'Consultations' : 'परामर्श'} <strong className="text-teal-450">{allAppointments.length}</strong>
              </span>
              <span className="px-3 py-1 bg-slate-800 border border-slate-700/55 rounded-full flex items-center gap-1.5">
                🏢 {language === 'en' ? 'B2B Inquiries' : 'थोक पूछताछ'} <strong className="text-teal-450">{allB2BQueries.length}</strong>
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-4">
              {/* Database Sync Status */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/60 border border-slate-750/50 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                  {language === 'en' ? 'Firebase Sync' : 'फायरबेस सिंक'}
                </span>
              </div>

              {/* Lock Session */}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('pharmacist_authorized');
                  setIsAuthenticated(false);
                }}
                className="py-1.5 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-xl text-3xs font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 shadow-sm font-sans"
              >
                <Lock className="w-2.5 h-2.5" />
                {language === 'en' ? 'Lock Portal' : 'पोर्टल लॉक करें'}
              </button>

              {/* Smaller, Hidden Portal Return Link */}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('pharmacist_authorized');
                  setIsAuthenticated(false);
                  onBackToHome();
                }}
                className="text-slate-500 hover:text-slate-350 text-3xs font-extrabold uppercase tracking-widest transition-all cursor-pointer border-l border-slate-800 pl-4 h-5 flex items-center font-sans bg-transparent border-t-0 border-r-0 border-b-0"
              >
                {language === 'en' ? 'Exit Portal' : 'बाहर निकलें'}
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Area */}
        <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 text-left">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {language === 'en' ? 'Systems Dashboard' : 'सिस्टम डैशबोर्ड'}
              </h2>
              <p className="text-2xs text-slate-400 uppercase tracking-widest font-semibold">
                {language === 'en' ? 'Manage operational status, client orders, and wholesale inquiries.' : 'परिचालन स्थिति, ग्राहक ऑर्डर और थोक पूछताछ का प्रबंधन करें।'}
              </p>
            </div>

            {/* Overrides integrated directly on the right */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('portal.clinicStatusOverride')}</span>
                  <span className="block text-[8px] text-slate-500 uppercase tracking-widest -mt-0.5">
                    {language === 'en' ? 'Force Portal Open Status' : 'पोर्टल खुली स्थिति बाध्य करें'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleOverride('auto')}
                  className={`py-1.5 px-3 rounded-lg text-3xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                    openOverride === 'auto'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-500/10'
                      : 'bg-slate-800 border-slate-700 text-slate-405 hover:text-slate-205'
                  }`}
                >
                  ⏱️ {language === 'en' ? 'Auto' : 'ऑतो'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOverride('open')}
                  className={`py-1.5 px-3 rounded-lg text-3xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                    openOverride === 'open'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-800 border-slate-700 text-slate-405 hover:text-emerald-405'
                  }`}
                >
                  🟢 {t('portal.forceOpen')}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOverride('closed')}
                  className={`py-1.5 px-3 rounded-lg text-3xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                    openOverride === 'closed'
                      ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-500/10'
                      : 'bg-slate-800 border-slate-700 text-slate-450 hover:text-rose-450'
                  }`}
                >
                  🔴 {t('portal.forceClosed')}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Console Tabs */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 max-w-xl mx-auto shadow-inner">
            <button
              onClick={() => handleTabChange('orders')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center border-0 ${
                adminTab === 'orders'
                  ? 'bg-teal-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent'
              }`}
            >
              📦 {language === 'en' ? 'Retail Orders' : 'खुदरा ऑर्डर'} ({allOrders.length})
            </button>
            <button
              onClick={() => handleTabChange('appointments')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center border-0 ${
                adminTab === 'appointments'
                  ? 'bg-teal-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent'
              }`}
            >
              📅 {language === 'en' ? 'Consultations' : 'परामर्श'} ({allAppointments.length})
            </button>
            <button
              onClick={() => handleTabChange('b2b')}
              className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center border-0 ${
                adminTab === 'b2b'
                  ? 'bg-teal-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent'
              }`}
            >
              🏢 {language === 'en' ? 'Wholesale Queries' : 'थोक पूछताछ'} ({allB2BQueries.length})
            </button>
          </div>

          {/* Filters Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 max-w-4xl mx-auto items-stretch md:items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  adminTab === 'orders' ? (language === 'en' ? "Search orders by name, phone, or address..." : "नाम, फोन या पते से ऑर्डर खोजें...") :
                  adminTab === 'appointments' ? (language === 'en' ? "Search appointments by patient name or phone..." : "मरीज के नाम या फोन से अपॉइंटमेंट खोजें...") :
                  (language === 'en' ? "Search wholesale queries by name, company, email, or remedies..." : "नाम, कंपनी, ईमेल या दवाओं से थोक पूछताछ खोजें...")
                }
                className="block w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all shadow-inner"
              />
            </div>

            {/* Status Dropdown Filter */}
            {adminTab !== 'b2b' && (
              <div className="w-full md:w-48 shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all shadow-inner font-bold"
                >
                  <option value="ALL" className="bg-slate-900">📋 {language === 'en' ? 'Show All Statuses' : 'सभी स्थितियां दिखाएं'}</option>
                  {adminTab === 'orders' ? (
                    <>
                      <option value="PENDING" className="bg-slate-900">⏳ {language === 'en' ? 'Pending Leads' : 'लंबित लीड'}</option>
                      <option value="SHIPPED" className="bg-slate-900">🚚 {language === 'en' ? 'Shipped Orders' : 'भेजे गए ऑर्डर'}</option>
                      <option value="COMPLETED" className="bg-slate-900">✅ {language === 'en' ? 'Completed Orders' : 'पूर्ण ऑर्डर'}</option>
                      <option value="CANCELLED" className="bg-slate-900">❌ {language === 'en' ? 'Cancelled Orders' : 'रद्द किए गए ऑर्डर'}</option>
                    </>
                  ) : (
                    <>
                      <option value="ACTIVE" className="bg-slate-900">🟢 {language === 'en' ? 'Active Bookings' : 'सक्रिय बुकिंग'}</option>
                      <option value="CANCELLED" className="bg-slate-900">🔴 {language === 'en' ? 'Cancelled Bookings' : 'रद्द की गई बुकिंग'}</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="py-2 px-4.5 bg-slate-800 border border-slate-750 hover:border-teal-500 hover:text-teal-400 text-slate-300 rounded-xl text-2xs font-extrabold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              📥 {language === 'en' ? 'Export CSV' : 'सीएसवी निर्यात करें'}
            </button>
          </div>

          {/* Database Logs display */}
          {loadingAdminData ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-teal-450 animate-spin" />
              <p className="text-2xs font-extrabold text-slate-500 uppercase tracking-widest">{t('portal.loading')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {adminTab === 'orders' ? (
                // Orders grid view
                filteredOrders.length === 0 ? (
                  <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-300">
                      {language === 'en' ? 'No Retail Orders Logged Yet' : 'अभी तक कोई खुदरा ऑर्डर दर्ज नहीं किया गया है'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'en' ? 'Newly placed retail orders will appear here automatically.' : 'नए खुदरा ऑर्डर यहां स्वचालित रूप से दिखाई देंगे।'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredOrders.map((order) => {
                      const isUpdating = adminActionLoadingId === order.id;
                      const status = order.lead_status || 'Pending';
                      
                      return (
                        <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between text-left">
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            status === 'Delivered' || status === 'Completed' ? 'bg-emerald-500' :
                            status === 'Out for Delivery' || status === 'Shipped' ? 'bg-amber-500' :
                            status === 'Cancelled' ? 'bg-rose-500' : 'bg-teal-500'
                          }`}></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div>
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">{t('portal.customer')}</span>
                                <span className="font-extrabold text-white text-sm">{order.customer_name}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                status === 'Delivered' || status === 'Completed' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-450 border-emerald-900/30' :
                                status === 'Out for Delivery' || status === 'Shipped' ? 'bg-amber-950/40 border-amber-900/50 text-amber-455 border-amber-900/30' :
                                status === 'Cancelled' ? 'bg-rose-950/40 border-rose-900/50 text-rose-455 border-rose-900/30' :
                                'bg-teal-950/40 border-teal-900/50 text-teal-455 border-teal-900/30 animate-pulse'
                              }`}>
                                {status === 'Pending' ? (language === 'en' ? 'Booked' : 'बुक किया गया') :
                                 status === 'Out for Delivery' || status === 'Shipped' ? (language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर') :
                                 status === 'Delivered' || status === 'Completed' ? (language === 'en' ? 'Delivered' : 'डिलिवर हो गया') : 
                                 status === 'Cancelled' ? (language === 'en' ? 'Cancelled' : 'रद्द') : status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.phone')}</span>
                                <a href={`tel:${order.phone}`} className="font-bold text-teal-400 hover:underline">{order.phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Ordered On' : 'ऑर्डर का समय'}</span>
                                <span className="font-semibold text-slate-350">
                                  {order.created_at ? new Date(order.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Unknown'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.address')}</span>
                                <span className="font-semibold text-slate-350">{order.address}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Remedies Breakdown' : 'दवाओं का विवरण'}</span>
                                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 whitespace-pre-wrap leading-tight mt-1">
                                  {order.medicines_list}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-4 mt-2 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-350">
                              <span>{language === 'en' ? 'Confirmed Price:' : 'पुष्टीकृत मूल्य:'}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-teal-500 font-bold">₹</span>
                                <input
                                  type="text"
                                  key={order.id + '_' + order.total_price}
                                  defaultValue={order.total_price}
                                  placeholder="e.g. 250"
                                  className="w-24 px-2 py-1 text-2xs bg-slate-950 border border-slate-800 rounded-lg text-teal-400 font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                                  onBlur={(e) => handleUpdateOrderPrice(order, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Out for Delivery')}
                                className="flex-1 py-1.5 px-2 bg-amber-950/20 hover:bg-amber-950/40 text-amber-405 border border-amber-900/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                🚚 {language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Delivered')}
                                className="flex-1 py-1.5 px-2 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-455 border border-emerald-900/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                ✅ {language === 'en' ? 'Delivered' : 'डिलिवर हो गया'}
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(order, 'Cancelled')}
                                className="flex-1 py-1.5 px-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-455 border border-rose-900/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                              >
                                ❌ {language === 'en' ? 'Cancel' : 'रद्द करें'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : adminTab === 'appointments' ? (
                // Consultations grid view
                filteredAppointments.length === 0 ? (
                  <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-300">
                      {language === 'en' ? 'No Patient Appointments Scheduled' : 'कोई मरीज अपॉइंटमेंट निर्धारित नहीं है'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'en' ? 'Newly booked consultation slots will appear here in real-time.' : 'नए बुक किए गए परामर्श स्लॉट यहां रीयल-टाइम में दिखाई देंगे।'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAppointments.map((apt) => {
                      const isUpdating = adminActionLoadingId === apt.id;
                      const isCancelled = apt.status === 'CANCELLED' || apt.cancelled === true;
                      
                      return (
                        <div key={apt.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between text-left">
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            isCancelled ? 'bg-rose-500' : 'bg-teal-500'
                          }`}></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div>
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">{t('portal.patient')}</span>
                                <span className="font-extrabold text-white text-sm">{apt.patient_name}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isCancelled ? 'bg-rose-950/40 border-rose-900/50 text-rose-400' : 'bg-teal-950/40 border-teal-900/50 text-teal-400'
                              }`}>
                                {isCancelled ? (language === 'en' ? 'Cancelled' : 'रद्द') : (language === 'en' ? 'Active' : 'सक्रिय')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Contact Phone' : 'संपर्क फोन'}</span>
                                <a href={`tel:${apt.patient_phone}`} className="font-bold text-teal-400 hover:underline">{apt.patient_phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.date')}</span>
                                <span className="font-bold text-slate-300">{apt.appointment_date}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.slot')}</span>
                                <span className="font-extrabold text-teal-450 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-900/50">{apt.time_slot}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Registered On' : 'पंजीकरण का समय'}</span>
                                <span className="font-semibold text-slate-400">
                                  {apt.created_at ? new Date(apt.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {!isCancelled && (
                            <div className="border-t border-slate-800 pt-4 mt-2">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateAppointmentStatus(apt, 'CANCELLED')}
                                className="w-full py-2 px-3 border border-rose-900/40 hover:bg-rose-950/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                              >
                                ❌ {language === 'en' ? 'Cancel Appointment Slot' : 'अपॉइंटमेंट स्लॉट रद्द करें'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                // Wholesale queries
                filteredB2B.length === 0 ? (
                  <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1 shadow-sm">
                    <p className="text-sm font-bold text-slate-300">
                      {language === 'en' ? 'No Wholesale Inquiries Logged Yet' : 'अभी तक कोई थोक पूछताछ दर्ज नहीं की गई है'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'en' ? 'Newly submitted B2B distribution queries will appear here automatically.' : 'नए थोक अनुरोध यहां स्वचालित रूप से दिखाई देंगे।'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredB2B.map((query) => {
                      return (
                        <div key={query.id || `${query.created_at}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between text-left">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div>
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">
                                  {language === 'en' ? 'Representative Name' : 'प्रतिनिधि का नाम'}
                                </span>
                                <span className="font-extrabold text-white text-sm">{query.client_name}</span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-teal-950/40 border-teal-900/50 text-teal-400">
                                {language === 'en' ? 'B2B Inquiry' : 'थोक पूछताछ'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-2xs leading-relaxed">
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.company')}</span>
                                <span className="font-bold text-slate-300">{query.company_name}</span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Submitted On' : 'प्रस्तुत करने का समय'}</span>
                                <span className="font-semibold text-slate-400">
                                  {query.created_at ? new Date(query.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.phone')}</span>
                                <a href={`tel:${query.phone}`} className="font-bold text-teal-400 hover:underline">{query.phone}</a>
                              </div>
                              <div>
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Contact Email' : 'संपर्क ईमेल'}</span>
                                <a href={`mailto:${query.email}`} className="font-bold text-teal-400 hover:underline break-all">{query.email}</a>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{language === 'en' ? 'Estimated Required Volume' : 'अनुमानित आवश्यक मात्रा'}</span>
                                <span className="font-extrabold text-slate-100 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-900/30 text-[10px] inline-block mt-0.5">
                                  {query.estimated_quantity} {language === 'en' ? 'Units' : 'यूनिट'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">{t('portal.details')}</span>
                                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 whitespace-pre-wrap leading-tight mt-1">
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

        </main>
      </div>
    );
  }

  // --- RENDER MAIN COMPONENT FOR PUBLIC LOOKUP VIEW ONLY ---
  const isOrdersOnly = onlyShowType === 'orders';
  const isAptsOnly = onlyShowType === 'appointments';

  const lookupTitle = isOrdersOnly ? t('bookings.titleOrders') : t('bookings.title');
  const lookupDesc = isOrdersOnly ? t('bookings.descOrders') : t('bookings.desc');
  const searchCardTitle = isOrdersOnly ? t('bookings.searchTitleOrders') : t('bookings.searchTitle');
  const searchCardDesc = isOrdersOnly ? t('bookings.searchDescOrders') : t('bookings.searchDesc');
  const searchButtonText = isOrdersOnly ? t('bookings.searchBtnOrders') : t('bookings.searchBtn');

  // Filter actual lists rendered based on onlyShowType
  const showApts = !isOrdersOnly && searchResults && searchResults.length > 0;
  const showOrders = !isAptsOnly && searchOrderResults && searchOrderResults.length > 0;

  const hasNoResults = (searchResults !== null || searchOrderResults !== null) && 
    ((isOrdersOnly && searchOrderResults?.length === 0) || 
     (isAptsOnly && searchResults?.length === 0) || 
     (!isOrdersOnly && !isAptsOnly && searchResults?.length === 0 && searchOrderResults?.length === 0));

  const totalResultsCount = (isOrdersOnly ? searchOrderResults?.length : (isAptsOnly ? searchResults?.length : (searchResults?.length || 0) + (searchOrderResults?.length || 0))) || 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 text-slate-800 animate-fade-in text-left font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-[#115E59] hover:text-[#0D4F4A] hover:underline font-bold text-xs uppercase tracking-wider cursor-pointer font-sans border-0 bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('bookings.backBtn')}
        </button>
        <span className="text-2xs font-extrabold uppercase tracking-widest text-[#5A6561] bg-[#F9F6F0] border border-[#EAE5DC] px-3 py-1 rounded-full">
          {isOrdersOnly 
            ? (language === 'en' ? 'Remedies Dispatch Verification' : 'दवा प्रेषण सत्यापन')
            : (language === 'en' ? 'Secure Proof Verification' : 'सुरक्षित प्रमाण सत्यापन')}
        </span>
      </div>

      {/* Lookup Mode Body */}
      <div className="space-y-12 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{lookupTitle}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {lookupDesc}
          </p>
        </div>

        {/* Phone Lookup card */}
        <div className="max-w-xl mx-auto bg-white border border-[#EAE5DC] rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#115E59]"></div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
              <Search className="w-4 h-4 text-[#115E59]" />
              {searchCardTitle}
            </h3>
            <p className="text-2xs text-slate-400">{searchCardDesc}</p>
          </div>

          <form onSubmit={handlePhoneSearch} className="space-y-4">
            <div>
              <label htmlFor="lookup-phone" className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                {t('bookings.enterPhone')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
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
              className="w-full btn-neon-emerald py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-0"
            >
              {searching ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t('bookings.searching')}</>
              ) : (
                <><Search className="w-4 h-4" />{searchButtonText}</>
              )}
            </button>
          </form>

          {/* Search Results */}
          {(searchResults !== null || searchOrderResults !== null) && (
            <div className="pt-4 border-t border-slate-100 space-y-6">
              {hasNoResults ? (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-455 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    {isOrdersOnly 
                      ? (language === 'en' ? 'No active homeopathic orders found' : 'कोई सक्रिय दवा ऑर्डर नहीं मिला')
                      : (language === 'en' ? 'No active consultation spots found' : 'कोई सक्रिय परामर्श स्लॉट नहीं मिला')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isOrdersOnly 
                      ? (language === 'en' 
                        ? 'We could not find any active remedies home delivery orders for this phone number.'
                        : 'हमें इस फोन नंबर के लिए कोई सक्रिय दवा वितरण ऑर्डर नहीं मिला।')
                      : (language === 'en'
                        ? 'We could not find any active doctor consultation token slots for this phone number.'
                        : 'हमें इस फोन नंबर के लिए कोई सक्रिय डॉक्टर परामर्श स्लॉट नहीं मिला।')}
                  </p>
                  <p className="text-3xs text-slate-455 uppercase font-black tracking-widest pt-2">
                    {t('bookings.tryAnother')}
                  </p>
                </div>
              ) : (
                <div className="space-y-8 text-left">
                  {/* Results Count Header */}
                  <div className="text-3xs font-extrabold uppercase tracking-widest text-[#5A6561]">
                    {isOrdersOnly 
                      ? t('bookings.foundBookingsOrders').replace('{count}', totalResultsCount)
                      : t('bookings.foundBookings').replace('{count}', totalResultsCount)}
                  </div>

                  {/* Appointments Section */}
                  {showApts && (
                    <div className="space-y-4">
                      <h4 className="text-2xs font-extrabold text-[#115E59] uppercase tracking-widest flex items-center gap-2 border-b border-[#EAE5DC]/60 pb-2 select-none">
                        🩺 {language === 'en' ? 'OPD Doctor Consultations' : 'ओपीडी डॉक्टर परामर्श'} ({searchResults.length})
                      </h4>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {searchResults.map(renderBookingCard)}
                      </div>
                    </div>
                  )}

                  {/* B2C Retail Orders Section */}
                  {showOrders && (
                    <div className="space-y-4">
                      <h4 className="text-2xs font-extrabold text-[#115E59] uppercase tracking-widest flex items-center gap-2 border-b border-[#EAE5DC]/60 pb-2 select-none">
                        📦 {language === 'en' ? 'Remedies Home Delivery' : 'दवा होम डिलीवरी'} ({searchOrderResults.length})
                      </h4>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {searchOrderResults.map(renderOrderCard)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
