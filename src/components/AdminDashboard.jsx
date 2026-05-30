import { useState, useEffect } from 'react';
import { Lock, RefreshCw, Package, Stethoscope, Briefcase, Clock, Search, ChevronDown, Download, CheckCircle, XCircle, AlertCircle, MessageCircle, Database, Trash2, Plus, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { doc, updateDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

export default function AdminDashboard({ onLogout }) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('retail');
  const [overrideStatus, setOverrideStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clinic_open_override') || 'auto';
    }
    return 'auto';
  });

  const handleOverrideStatusChange = (val) => {
    setOverrideStatus(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_open_override', val);
      window.dispatchEvent(new Event('clinic-override-updated'));
    }
  };
  
  // Data State
  const [retailOrders, setRetailOrders] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [wholesaleQueries, setWholesaleQueries] = useState([]);
  const [medicinePrices, setMedicinePrices] = useState([]);
  
  // Pricing inventory state
  const [newMedName, setNewMedName] = useState('');
  const [newMedPotency, setNewMedPotency] = useState('30C');
  const [newMedSize, setNewMedSize] = useState('30ml');
  const [newMedPrice, setNewMedPrice] = useState('');
  const [editingMedId, setEditingMedId] = useState(null);
  
  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error' | 'mock'
  const [lastSync, setLastSync] = useState(null);

  const fetchPortalData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      let rOrders = [];
      let rApts = [];
      let rBulk = [];
      let fetchedSuccessfully = false;

      let rPrices = [];

      if (isFirebaseConfigured) {
        try {
          const ordersSnapshot = await getDocs(collection(db, 'retail_orders'));
          ordersSnapshot.forEach((docSnap) => rOrders.push({ id: docSnap.id, ...docSnap.data() }));
          
          const aptsSnapshot = await getDocs(collection(db, 'clinic_appointments'));
          aptsSnapshot.forEach((docSnap) => rApts.push({ id: docSnap.id, ...docSnap.data() }));
          
          const b2bSnapshot = await getDocs(collection(db, 'bulk_orders'));
          b2bSnapshot.forEach((docSnap) => rBulk.push({ id: docSnap.id, ...docSnap.data() }));

          const pricesSnapshot = await getDocs(collection(db, 'medicine_prices'));
          pricesSnapshot.forEach((docSnap) => rPrices.push({ id: docSnap.id, ...docSnap.data() }));
          
          fetchedSuccessfully = true;
          setSyncStatus('success');
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore fetch failed, falling back to Google Sheets / local mockDb:", firestoreErr);
        }
      }

      if (!fetchedSuccessfully) {
        try {
          const response = await fetch('/api/readSheets');
          const result = await response.json();
          
          if (result.status === 'success' && result.data) {
            rOrders = result.data.retailOrders || [];
            rApts = result.data.appointments || [];
            rBulk = result.data.b2bQueries || [];
            setSyncStatus('success');
            fetchedSuccessfully = true;
          }
        } catch (sheetErr) {
          console.warn("⚠️ Google Sheets fetch fallback failed:", sheetErr);
        }
      }

      if (!fetchedSuccessfully) {
        // Fallback to local storage (mockDb)
        const localRetail = JSON.parse(localStorage.getItem('retail_orders') || '[]');
        const localBulk = JSON.parse(localStorage.getItem('bulk_orders') || '[]');
        const localApts = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
        
        rOrders = localRetail;
        rApts = localApts;
        rBulk = localBulk;
        
        setSyncStatus('mock');
      }

      // Load prices from local storage if firestore didn't return them
      if (rPrices.length === 0) {
        rPrices = JSON.parse(localStorage.getItem('medicine_prices') || '[]');
        if (rPrices.length === 0) {
          // Seed defaults
          rPrices = [
            { id: '1', name: 'Arnica Montana', size: '30ml', price: '100' },
            { id: '2', name: 'Nux Vomica', size: '30ml', price: '105' },
            { id: '3', name: 'Belladonna', size: '30ml', price: '95' },
            { id: '4', name: 'Rhus Tox', size: '30ml', price: '100' }
          ];
          localStorage.setItem('medicine_prices', JSON.stringify(rPrices));
        }
      }
      setMedicinePrices(rPrices);

      // Dynamic field normalization so the table renders cleanly in all formats!
      const normalizedOrders = rOrders.map(o => ({
        id: o.id,
        phone: o.phone || '',
        email: o.email || '',
        address: o.address || '',
        customer_name: o.customer_name || o.customerName || o.name || '',
        customerName: o.customer_name || o.customerName || o.name || '',
        name: o.customer_name || o.customerName || o.name || '',
        medicines_list: o.medicines_list || o.medicinesList || o.medicines || '',
        medicinesList: o.medicines_list || o.medicinesList || o.medicines || '',
        medicines: o.medicines_list || o.medicinesList || o.medicines || '',
        total_price: o.total_price || o.totalEstimatedPrice || o.totalPrice || 'TBD',
        totalEstimatedPrice: o.total_price || o.totalEstimatedPrice || o.totalPrice || 'TBD',
        totalPrice: o.total_price || o.totalEstimatedPrice || o.totalPrice || 'TBD',
        lead_status: o.lead_status || o.status || 'Pending',
        status: o.lead_status || o.status || 'Pending',
        timestamp: o.timestamp || o.created_at || '',
        created_at: o.timestamp || o.created_at || ''
      }));

      const normalizedApts = rApts.map(a => ({
        id: a.id,
        patient_name: a.patient_name || a.patientName || '',
        patientName: a.patient_name || a.patientName || '',
        patient_phone: a.patient_phone || a.patientPhone || '',
        patientPhone: a.patient_phone || a.patientPhone || '',
        appointment_date: a.appointment_date || a.appointmentDate || '',
        appointmentDate: a.appointment_date || a.appointmentDate || '',
        time_slot: a.time_slot || a.timeSlot || '',
        timeSlot: a.time_slot || a.timeSlot || '',
        status: a.status || (a.cancelled ? 'CANCELLED' : 'Pending'),
        cancelled: a.cancelled || a.status === 'CANCELLED',
        timestamp: a.timestamp || a.created_at || '',
        created_at: a.timestamp || a.created_at || ''
      }));

      const normalizedBulk = rBulk.map(q => ({
        id: q.id,
        client_name: q.client_name || q.contactName || q.name || '',
        contactName: q.client_name || q.contactName || q.name || '',
        name: q.client_name || q.contactName || q.name || '',
        company_name: q.company_name || q.companyName || '',
        companyName: q.company_name || q.companyName || '',
        phone: q.phone || '',
        email: q.email || '',
        estimated_quantity: q.estimated_quantity || q.estimatedQuantity || q.quantity || '',
        estimatedQuantity: q.estimated_quantity || q.estimatedQuantity || q.quantity || '',
        quantity: q.estimated_quantity || q.estimatedQuantity || q.quantity || '',
        requirements_text: q.requirements_text || q.requirements || '',
        requirements: q.requirements_text || q.requirements || '',
        timestamp: q.timestamp || q.created_at || '',
        created_at: q.timestamp || q.created_at || ''
      }));

      // Sort: newest first
      normalizedOrders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      normalizedApts.sort((a, b) => new Date(b.appointment_date || 0) - new Date(a.appointment_date || 0));
      normalizedBulk.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setRetailOrders(normalizedOrders);
      setConsultations(normalizedApts);
      setWholesaleQueries(normalizedBulk);
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
    const interval = setInterval(() => {
      fetchPortalData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Reset search and status filter when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('ALL');
  }, [activeTab]);

  // Helper: silently send WhatsApp via /api/sendWhatsApp (no browser popup)
  const sendWhatsAppSilent = (payload) => {
    fetch('/api/sendWhatsApp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') console.log(`✅ WhatsApp sent [${payload.type}] to`, payload.phone || payload.patient_phone);
        else console.warn('⚠️ WhatsApp send result:', d);
      })
      .catch(e => console.error('❌ WhatsApp API error:', e));
  };

  // Status updaters for Retail Orders in portal
  const handleUpdatePortalOrderStatus = async (orderId, newStatus) => {
    const order = retailOrders.find(o => o.id === orderId);
    if (!order) return;

    // Optimistic Update: Update local state immediately so user sees instant feedback
    setRetailOrders(prev => prev.map(ord => ord.id === orderId ? { ...ord, status: newStatus, lead_status: newStatus } : ord));

    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !orderId.startsWith('Retail_Orders_')) {
        try {
          await updateDoc(doc(db, 'retail_orders', orderId), {
            lead_status: newStatus,
            status: newStatus
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore retail order update failed, falling back to mockDb:", firestoreErr);
        }
      }

      if (!docUpdated) {
        await mockDb.updateRetailOrderStatus(orderId, newStatus);
      }

      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_order_status',
          data: {
            phone: order.phone,
            timestamp: order.timestamp || (order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''),
            status: newStatus
          }
        })
      }).catch(e => console.error('Sheets status sync failed:', e));

      toast.success(`Order status updated to "${newStatus}"`);

      // Auto-send WhatsApp silently (no browser popup)
      sendWhatsAppSilent({
        type: 'retail_status_update',
        customer_name: order.customerName || order.name,
        phone: order.phone,
        medicines_list: order.medicinesList || order.medicines,
        total_price: order.total_price,
        order_status: newStatus
      });
    } catch (err) {
      console.error('Failed to update retail order status from portal:', err);
      toast.error('Failed to update order status');
    }
  };

  // Price updaters for Retail Orders in portal
  const handleUpdatePortalOrderPrice = async (orderId, newPrice) => {
    const order = retailOrders.find(o => o.id === orderId);
    if (!order) return;
    if ((order.total_price || '').trim() === (newPrice || '').trim()) return;
    if (!newPrice || !newPrice.trim()) return;

    // Optimistic Update
    setRetailOrders(prev => prev.map(ord => ord.id === orderId ? { ...ord, total_price: newPrice, totalPrice: newPrice, totalEstimatedPrice: newPrice } : ord));

    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !orderId.startsWith('Retail_Orders_')) {
        try {
          await updateDoc(doc(db, 'retail_orders', orderId), {
            total_price: newPrice
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore price update failed, falling back to mockDb:", firestoreErr);
        }
      }

      if (!docUpdated) {
        await mockDb.updateRetailOrderPrice(orderId, newPrice);
      }

      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_order_price',
          data: {
            phone: order.phone,
            timestamp: order.timestamp || (order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''),
            price: newPrice
          }
        })
      }).catch(e => console.error('Sheets price sync failed:', e));

      toast.success(`Order price set to ₹${newPrice}`);

      // Auto-send WhatsApp silently (no browser popup)
      sendWhatsAppSilent({
        type: 'retail_price_update',
        customer_name: order.customerName || order.name,
        phone: order.phone,
        medicines_list: order.medicinesList || order.medicines,
        new_price: newPrice
      });
    } catch (err) {
      console.error('Failed to update retail order price from portal:', err);
      toast.error('Failed to update price');
    }
  };

  // Medicine pricing database CRUD handlers
  const handleAddOrUpdateMedicinePrice = async (e) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedPrice.trim()) {
      toast.error('Please enter both name and price');
      return;
    }

    const priceNum = parseFloat(newMedPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (editingMedId) {
      // Edit mode
      const updated = {
        name: newMedName.trim(),
        potency: newMedPotency,
        size: newMedSize,
        price: newMedPrice.trim()
      };

      setMedicinePrices(prev => prev.map(m => m.id === editingMedId ? { ...m, ...updated } : m));

      try {
        let isUpdated = false;
        if (isFirebaseConfigured && !editingMedId.startsWith('temp_')) {
          try {
            await updateDoc(doc(db, 'medicine_prices', editingMedId), updated);
            isUpdated = true;
          } catch (fErr) {
            console.warn("Firestore price edit failed, fallback to local:", fErr);
          }
        }
        if (!isUpdated) {
          const local = JSON.parse(localStorage.getItem('medicine_prices') || '[]');
          const idx = local.findIndex(m => m.id === editingMedId);
          if (idx !== -1) {
            local[idx] = { ...local[idx], ...updated };
            localStorage.setItem('medicine_prices', JSON.stringify(local));
          }
        }
        toast.success('Medicine price updated successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to update medicine price');
      }

      setEditingMedId(null);
    } else {
      // Add mode
      const tempId = 'temp_' + Date.now();
      const newPriceObj = {
        name: newMedName.trim(),
        potency: newMedPotency,
        size: newMedSize,
        price: newMedPrice.trim()
      };

      setMedicinePrices(prev => [...prev, { id: tempId, ...newPriceObj }]);

      try {
        let savedId = tempId;
        if (isFirebaseConfigured) {
          try {
            const docRef = await addDoc(collection(db, 'medicine_prices'), newPriceObj);
            savedId = docRef.id;
            // Update temp ID to actual Firestore ID
            setMedicinePrices(prev => prev.map(m => m.id === tempId ? { ...m, id: savedId } : m));
          } catch (fErr) {
            console.warn("Firestore price add failed, fallback to local:", fErr);
          }
        }
        
        // Always save to localStorage as sync/fallback
        const local = JSON.parse(localStorage.getItem('medicine_prices') || '[]');
        local.push({ id: savedId, ...newPriceObj });
        localStorage.setItem('medicine_prices', JSON.stringify(local));
        
        toast.success('Medicine price added successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to save medicine price');
      }
    }

    setNewMedName('');
    setNewMedPotency('30C');
    setNewMedPrice('');
    setNewMedSize('30ml');
  };

  const handleEditMedPrice = (med) => {
    setEditingMedId(med.id);
    setNewMedName(med.name);
    setNewMedPotency(med.potency || '30C');
    setNewMedSize(med.size || '30ml');
    setNewMedPrice(med.price);
  };

  const handleDeleteMedPrice = async (medId) => {
    if (!confirm('Are you sure you want to delete this price record?')) return;

    setMedicinePrices(prev => prev.filter(m => m.id !== medId));

    try {
      let isDeleted = false;
      if (isFirebaseConfigured && !medId.startsWith('temp_')) {
        try {
          await deleteDoc(doc(db, 'medicine_prices', medId));
          isDeleted = true;
        } catch (fErr) {
          console.warn("Firestore price delete failed, fallback to local:", fErr);
        }
      }

      const local = JSON.parse(localStorage.getItem('medicine_prices') || '[]');
      const filtered = local.filter(m => m.id !== medId);
      localStorage.setItem('medicine_prices', JSON.stringify(filtered));

      toast.success('Medicine price deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete medicine price');
    }
  };

  // Status updaters for Appointments in portal
  const handleUpdatePortalAptStatus = async (aptId, newStatus) => {
    const apt = consultations.find(a => a.id === aptId);
    if (!apt) return;

    // Optimistic Update: Update local state immediately so user sees instant feedback
    setConsultations(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus, cancelled: newStatus === 'CANCELLED' } : a));

    try {
      let docUpdated = false;
      if (isFirebaseConfigured && !aptId.startsWith('Appointments_')) {
        try {
          await updateDoc(doc(db, 'clinic_appointments', aptId), {
            status: newStatus,
            cancelled: newStatus === 'CANCELLED'
          });
          docUpdated = true;
        } catch (firestoreErr) {
          console.warn("⚠️ Firestore appointment status update failed, falling back to mockDb:", firestoreErr);
        }
      }

      if (!docUpdated) {
        await mockDb.updateAppointmentStatus(aptId, newStatus);
      }

      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update_appointment_status',
          data: {
            patient_name: apt.patientName || apt.patient_name,
            patient_phone: apt.patientPhone || apt.patient_phone,
            appointment_date: apt.appointmentDate || apt.appointment_date,
            time_slot: apt.timeSlot || apt.time_slot,
            status: newStatus
          }
        })
      }).catch(e => console.error('Sheets appointment sync failed:', e));

      toast.success(`Appointment status updated to "${newStatus}"`);

      // Auto-send WhatsApp silently (no browser popup)
      sendWhatsAppSilent({
        type: 'appointment_status',
        patient_name: apt.patientName || apt.patient_name,
        patient_phone: apt.patientPhone || apt.patient_phone,
        apt_status: newStatus,
        apt_date: apt.appointmentDate || apt.appointment_date,
        apt_slot: apt.timeSlot || apt.time_slot
      });
    } catch (err) {
      console.error('Failed to update appointment status from portal:', err);
      toast.error('Failed to update appointment status');
    }
  };

  // Filter lists dynamically based on search term and status filter
  const getFilteredRetailOrders = () => {
    return retailOrders.filter(order => {
      // 1. Search filter (name, phone, address, medicines)
      const matchesSearch = 
        !searchTerm.trim() ||
        (order.customerName || order.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.medicinesList || order.medicines || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      const statusVal = (order.status || order.lead_status || 'Pending').toLowerCase();
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        const f = statusFilter.toLowerCase();
        if (f === 'pending') {
          matchesStatus = statusVal === 'pending';
        } else if (f === 'booked' || f === 'confirmed') {
          matchesStatus = statusVal === 'booked' || statusVal.includes('confirm');
        } else if (f === 'out for delivery') {
          matchesStatus = statusVal.includes('out for delivery') || statusVal === 'shipped';
        } else if (f === 'out of stock') {
          matchesStatus = statusVal.includes('out of stock');
        } else if (f === 'delivered') {
          matchesStatus = statusVal === 'delivered' || statusVal.includes('complet');
        } else if (f === 'cancelled') {
          matchesStatus = statusVal.includes('cancel');
        }
      }

      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredConsultations = () => {
    return consultations.filter(apt => {
      // 1. Search filter (patient name, phone)
      const matchesSearch = 
        !searchTerm.trim() ||
        (apt.patientName || apt.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.patientPhone || apt.patient_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.appointmentDate || apt.appointment_date || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.timeSlot || apt.time_slot || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      const statusVal = (apt.status || (apt.cancelled ? 'cancelled' : 'Pending')).toLowerCase();
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        const f = statusFilter.toLowerCase();
        if (f === 'pending') {
          matchesStatus = statusVal === 'pending';
        } else if (f === 'booked' || f === 'confirmed') {
          matchesStatus = statusVal === 'confirmed' || statusVal === 'booked';
        } else if (f === 'cancelled') {
          matchesStatus = statusVal.includes('cancel');
        } else {
          matchesStatus = false;
        }
      }

      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredWholesaleQueries = () => {
    return wholesaleQueries.filter(query => {
      const matchesSearch = 
        !searchTerm.trim() ||
        (query.companyName || query.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (query.contactName || query.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (query.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (query.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (query.requirements || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  };

  // CSV Exporter for local data
  const handleExportCSV = () => {
    let headers;
    let rows;
    let filename;

    if (activeTab === 'retail') {
      const dataToExport = getFilteredRetailOrders();
      headers = ['Timestamp', 'Customer Name', 'Phone', 'Email', 'Address', 'Medicines List', 'Total Price', 'Status'];
      rows = dataToExport.map(order => [
        order.timestamp || order.created_at || '',
        order.customerName || order.name || '',
        order.phone || '',
        order.email || '',
        (order.address || '').replace(/"/g, '""'),
        (order.medicinesList || order.medicines || '').replace(/"/g, '""'),
        order.totalEstimatedPrice || order.totalPrice || 'TBD',
        order.status || order.lead_status || 'Pending'
      ]);
      filename = 'KHH_Retail_Orders.csv';
    } else if (activeTab === 'consultations') {
      const dataToExport = getFilteredConsultations();
      headers = ['Timestamp', 'Patient Name', 'Patient Phone', 'Appointment Date', 'Time Slot', 'Status'];
      rows = dataToExport.map(apt => [
        apt.timestamp || apt.created_at || '',
        apt.patientName || apt.patient_name || '',
        apt.patientPhone || apt.patient_phone || '',
        apt.appointmentDate || apt.appointment_date || '',
        apt.timeSlot || apt.time_slot || '',
        apt.status || (apt.cancelled ? 'CANCELLED' : 'Pending')
      ]);
      filename = 'KHH_Consultations.csv';
    } else {
      const dataToExport = getFilteredWholesaleQueries();
      headers = ['Timestamp', 'Company Name', 'Contact Name', 'Phone', 'Email', 'Quantity', 'Requirements'];
      rows = dataToExport.map(query => [
        query.timestamp || query.created_at || '',
        query.companyName || query.company_name || '',
        query.contactName || query.name || '',
        query.phone || '',
        query.email || '',
        query.estimatedQuantity || query.quantity || '',
        (query.requirements || '').replace(/"/g, '""')
      ]);
      filename = 'KHH_Wholesale_Queries.csv';
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Helper
  const renderStatus = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'delivered' || s.includes('complet')) {
      return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/30">{language === 'en' ? 'Delivered' : 'डिलिवर हो गया'}</span>;
    }
    if (s.includes('out for delivery') || s === 'shipped') {
      return <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/30">{language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</span>;
    }
    if (s.includes('out of stock')) {
      return <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-orange-500/30">{language === 'en' ? 'Out of Stock' : 'स्टॉक में नहीं'}</span>;
    }
    if (s.includes('cancel')) {
      return <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-500/30">{language === 'en' ? 'Cancelled' : 'रद्द'}</span>;
    }
    if (s.includes('confirm') || s === 'booked' || s.includes('sched')) {
      return <span className="bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-teal-500/30">{language === 'en' ? 'Booked' : 'बुक किया गया'}</span>;
    }
    return <span className="bg-[#0F766E]/20 text-[#2DD4BF] px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-[#0F766E]/30">{language === 'en' ? 'Pending' : 'लंबित'}</span>;
  };

  const getNormalizedRetailStatus = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s.includes('out of stock')) return 'Out of Stock';
    if (s.includes('out') || s === 'shipped') return 'Out for Delivery';
    if (s.includes('deliver') || s.includes('complet')) return 'Delivered';
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('confirm') || s === 'booked' || s.includes('sched')) return 'Booked';
    return 'Pending';
  };

  const renderActiveTable = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 w-full h-full min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('portal.loading')}</p>
        </div>
      );
    }

    const filteredRetail = getFilteredRetailOrders();
    const filteredConsults = getFilteredConsultations();
    const filteredWholesale = getFilteredWholesaleQueries();

    if (activeTab === 'retail') {
      if (filteredRetail.length === 0) return <EmptyState tab="Retail Orders" isFiltered={retailOrders.length > 0} />;
      return (
        <div>
          {/* Card Layout for Mobile */}
          <div className="block md:hidden space-y-4 p-4">
            {filteredRetail.map((order, i) => (
              <div key={i} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 space-y-4 shadow-xl hover:border-[#0F766E]/50 transition-all">
                <div className="flex items-start justify-between gap-2 border-b border-[#1E293B]/60 pb-3">
                  <span className="text-[10px] text-slate-450 font-mono font-bold">{order.timestamp || order.created_at}</span>
                  {renderStatus(order.status || order.lead_status)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-white text-base tracking-tight">{order.customerName || order.name}</h4>
                    {order.phone && (
                      <a 
                        href={`https://wa.me/91${order.phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(
                          order.total_price && order.total_price !== 'TBD'
                            ? `Hello ${order.customerName || order.name},\n\nYour retail order request from *Kanchan Homoeo Hall* has been verified!\n\n💊 *Medicines*:\n${order.medicinesList || order.medicines}\n\n✅ *Confirmed MRP Total*: *₹${order.total_price}* (including discount)\n\nWe are preparing your package for dispatch. Thank you! 🙏`
                            : `Hello ${order.customerName || order.name}, regarding your order from Kanchan Homoeo Hall for: ${order.medicinesList || order.medicines}. We wanted to inform you...`
                        )}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          order.total_price && order.total_price !== 'TBD'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-[#0F766E]/10 border-[#0F766E]/20 text-[#2DD4BF] hover:bg-[#0F766E]/25'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{order.total_price && order.total_price !== 'TBD' ? 'Send confirmed MRP' : 'WhatsApp'}</span>
                      </a>
                    )}
                  </div>
                  
                  {order.phone && <div className="text-xs text-slate-350 font-mono font-bold">📞 {order.phone}</div>}
                  {order.email && <div className="text-[10px] text-slate-500 truncate">{order.email}</div>}
                  {order.address && (
                    <div className="text-xs text-slate-400 bg-[#0B1120] border border-[#1E293B]/40 rounded-xl p-2.5 mt-1 whitespace-pre-wrap">
                      <span className="text-[9px] uppercase tracking-wider text-slate-550 font-bold block mb-1">📍 Delivery Address</span>
                      {order.address}
                    </div>
                  )}
                </div>

                <div className="bg-[#0B1120]/60 border border-[#1E293B] rounded-xl p-3 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-[#2DD4BF] font-black block">💊 Medicines</span>
                  <p className="text-xs text-slate-350 whitespace-pre-wrap leading-relaxed">{order.medicinesList || order.medicines}</p>
                  {order.estimatedMedicinesPrice && <div className="text-[10px] text-emerald-400 font-bold mt-1">Est. {order.estimatedMedicinesPrice}</div>}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1E293B]/60">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black">💰 Total Price</span>
                    <div className="flex items-center gap-1 w-full bg-[#0B1120] border border-[#1E293B] rounded-lg px-2 py-1.5">
                      <span className="text-emerald-500 font-bold text-xs">₹</span>
                      <input
                        type="text"
                        key={'mobile_order_' + order.id + '_' + (order.total_price || order.totalEstimatedPrice)}
                        defaultValue={order.total_price || order.totalEstimatedPrice || ''}
                        placeholder="TBD"
                        className="w-full bg-transparent border-none focus:outline-none text-[#2DD4BF] font-mono text-xs font-bold text-right outline-none"
                        onBlur={(e) => handleUpdatePortalOrderPrice(order.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black">⚙️ Update Status</span>
                    <div className="relative w-full">
                      <select
                        value={getNormalizedRetailStatus(order.status || order.lead_status)}
                        onChange={(e) => handleUpdatePortalOrderStatus(order.id, e.target.value)}
                        className="appearance-none w-full bg-[#0B1120] border border-[#1E293B] hover:border-[#0F766E] rounded-lg py-1.5 pl-2.5 pr-8 text-[11px] text-white focus:outline-none transition-colors cursor-pointer outline-none font-bold"
                      >
                        <option value="Pending" className="bg-[#0A1020] text-slate-400">⏳ Pending</option>
                        <option value="Booked" className="bg-[#0A1020] text-teal-400">📦 Booked</option>
                        <option value="Out for Delivery" className="bg-[#0A1020] text-amber-500">🚚 Out for Delivery</option>
                        <option value="Out of Stock" className="bg-[#0A1020] text-orange-400">⚠️ Out of Stock</option>
                        <option value="Delivered" className="bg-[#0A1020] text-emerald-400">✅ Delivered</option>
                        <option value="Cancelled" className="bg-[#0A1020] text-rose-400">❌ Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-[#0A1020]">
                <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-bold rounded-tl-2xl">{language === 'en' ? 'Timestamp' : 'समय'}</th>
                  <th className="p-4 font-bold">{t('portal.customer')}</th>
                  <th className="p-4 font-bold">{language === 'en' ? 'Contact' : 'संपर्क'}</th>
                  <th className="p-4 font-bold">{language === 'en' ? 'Medicines (Est. Value)' : 'दवाएं (अनुमानित मूल्य)'}</th>
                  <th className="p-4 font-bold">{t('portal.totalPrice')}</th>
                  <th className="p-4 font-bold">{t('portal.status')}</th>
                  <th className="p-4 font-bold rounded-tr-2xl">{language === 'en' ? 'Action' : 'कार्रवाई'}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#1E293B]/50">
                {filteredRetail.map((order, i) => (
                  <tr key={i} className="hover:bg-[#1E293B]/30 transition-colors">
                    <td className="p-4 text-xs text-slate-400">{order.timestamp || order.created_at}</td>
                    <td className="p-4 font-bold text-white">{order.customerName || order.name}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <span>{order.phone}</span>
                        {order.phone && (
                          <a href={`https://wa.me/91${order.phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hello ${order.customerName || order.name}, regarding your order from Kanchan Homoeo Hall for: ${order.medicinesList || order.medicines}. We wanted to inform you...`)}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors" title="WhatsApp Customer">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{order.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="whitespace-normal min-w-[200px] text-slate-300">
                        {order.medicinesList || order.medicines}
                      </div>
                      {order.estimatedMedicinesPrice && <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Est. {order.estimatedMedicinesPrice}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-500 font-bold">₹</span>
                        <input
                          type="text"
                          key={order.id + '_' + (order.total_price || order.totalEstimatedPrice)}
                          defaultValue={order.total_price || order.totalEstimatedPrice || ''}
                          placeholder="TBD"
                          className="w-20 px-2 py-1 text-xs bg-[#0B1120] border border-[#1E293B] focus:border-[#0F766E] rounded-lg text-[#2DD4BF] font-mono text-right focus:outline-none focus:ring-1 focus:ring-[#0F766E]/40 transition-all font-bold"
                          onBlur={(e) => handleUpdatePortalOrderPrice(order.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-4">{renderStatus(order.status || order.lead_status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="relative inline-block w-36">
                          <select
                            value={getNormalizedRetailStatus(order.status || order.lead_status)}
                            onChange={(e) => handleUpdatePortalOrderStatus(order.id, e.target.value)}
                            className="appearance-none w-full bg-[#0B1120] border border-[#1E293B] hover:border-[#0F766E] rounded-lg py-1.5 px-3 pr-8 text-xs text-white focus:outline-none transition-colors cursor-pointer outline-none font-bold"
                          >
                            <option value="Pending" className="bg-[#0A1020] text-slate-400">⏳ {language === 'en' ? 'Pending' : 'लंबित'}</option>
                            <option value="Booked" className="bg-[#0A1020] text-teal-400">📦 {language === 'en' ? 'Booked' : 'बुक किया गया'}</option>
                            <option value="Out for Delivery" className="bg-[#0A1020] text-amber-500">🚚 {language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</option>
                            <option value="Out of Stock" className="bg-[#0A1020] text-orange-400">⚠️ {language === 'en' ? 'Out of Stock' : 'स्टॉक में नहीं'}</option>
                            <option value="Delivered" className="bg-[#0A1020] text-emerald-400">✅ {language === 'en' ? 'Delivered' : 'डिलिवर हो गया'}</option>
                            <option value="Cancelled" className="bg-[#0A1020] text-rose-400">❌ {language === 'en' ? 'Cancelled' : 'रद्द'}</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </div>
                        {order.phone && order.total_price && order.total_price !== 'TBD' && (
                          <a 
                            href={`https://wa.me/91${order.phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(
                              `Hello ${order.customerName || order.name},\n\nYour retail order request from *Kanchan Homoeo Hall* has been verified!\n\n💊 *Medicines*:\n${order.medicinesList || order.medicines}\n\n✅ *Confirmed MRP Total*: *₹${order.total_price}* (including discount)\n\nWe are preparing your package for dispatch. Thank you! 🙏`
                            )}`}
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center justify-center p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer shadow-md shadow-emerald-900/10 hover:scale-105 transition-transform"
                            title="Send confirmed price receipt via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'consultations') {
      if (filteredConsults.length === 0) return <EmptyState tab="Consultations" isFiltered={consultations.length > 0} />;
      return (
        <div>
          {/* Card Layout for Mobile */}
          <div className="block md:hidden space-y-4 p-4">
            {filteredConsults.map((apt, i) => (
              <div key={i} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 space-y-4 shadow-xl hover:border-[#0F766E]/50 transition-all">
                <div className="flex items-start justify-between gap-2 border-b border-[#1E293B]/60 pb-3">
                  <span className="text-[10px] text-slate-450 font-mono font-bold">{apt.timestamp || apt.created_at}</span>
                  {renderStatus(apt.status)}
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-base tracking-tight">{apt.patientName || apt.patient_name}</h4>
                  {apt.patientPhone && <div className="text-xs text-slate-350 font-mono font-bold">📞 {apt.patientPhone || apt.patient_phone}</div>}
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#0B1120]/60 border border-[#1E293B] rounded-xl p-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#2DD4BF] font-black block">📅 Date</span>
                    <span className="text-xs text-slate-300 font-medium">{apt.appointmentDate || apt.appointment_date}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#2DD4BF] font-black block">⏰ Time Slot</span>
                    <span className="text-xs text-white font-bold">{apt.timeSlot || apt.time_slot}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B]/60">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black">⚙️ Update Status</span>
                    <div className="relative w-full">
                      <select
                        value={
                          ['Confirmed', 'Booked', 'BOOKED'].includes(apt.status) ? 'Confirmed' :
                          (['CANCELLED', 'Cancelled'].includes(apt.status) || apt.cancelled) ? 'CANCELLED' :
                          'Pending'
                        }
                        onChange={(e) => handleUpdatePortalAptStatus(apt.id, e.target.value)}
                        className="appearance-none w-full bg-[#0B1120] border border-[#1E293B] hover:border-[#0F766E] rounded-lg py-1.5 pl-2.5 pr-8 text-[11px] text-white focus:outline-none transition-colors cursor-pointer outline-none font-bold"
                      >
                        <option value="Pending" className="bg-[#0A1020] text-slate-400">⏳ Pending</option>
                        <option value="Confirmed" className="bg-[#0A1020] text-emerald-400">✅ Confirmed</option>
                        <option value="CANCELLED" className="bg-[#0A1020] text-rose-400">❌ Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-[#0A1020]">
                <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-bold rounded-tl-2xl">{language === 'en' ? 'Timestamp' : 'समय'}</th>
                  <th className="p-4 font-bold">{t('portal.patient')}</th>
                  <th className="p-4 font-bold">{t('portal.phone')}</th>
                  <th className="p-4 font-bold">{t('portal.date')}</th>
                  <th className="p-4 font-bold">{t('portal.slot')}</th>
                  <th className="p-4 font-bold">{t('portal.status')}</th>
                  <th className="p-4 font-bold rounded-tr-2xl">{language === 'en' ? 'Action' : 'कार्रवाई'}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#1E293B]/50">
                {filteredConsults.map((apt, i) => (
                  <tr key={i} className="hover:bg-[#1E293B]/30 transition-colors">
                    <td className="p-4 text-xs text-slate-400">{apt.timestamp || apt.created_at}</td>
                    <td className="p-4 font-bold text-white">{apt.patientName || apt.patient_name}</td>
                    <td className="p-4 text-slate-300">{apt.patientPhone || apt.patient_phone}</td>
                    <td className="p-4 text-slate-300 font-medium">{apt.appointmentDate || apt.appointment_date}</td>
                    <td className="p-4 text-white font-bold">{apt.timeSlot || apt.time_slot}</td>
                    <td className="p-4">{renderStatus(apt.status)}</td>
                    <td className="p-4">
                      <div className="relative inline-block w-36">
                        <select
                          value={
                            ['Confirmed', 'Booked', 'BOOKED'].includes(apt.status) ? 'Confirmed' :
                            (['CANCELLED', 'Cancelled'].includes(apt.status) || apt.cancelled) ? 'CANCELLED' :
                            'Pending'
                          }
                          onChange={(e) => handleUpdatePortalAptStatus(apt.id, e.target.value)}
                          className="appearance-none w-full bg-[#0B1120] border border-[#1E293B] hover:border-[#0F766E] rounded-lg py-1.5 px-3 pr-8 text-xs text-white focus:outline-none transition-colors cursor-pointer outline-none font-bold"
                        >
                          <option value="Pending" className="bg-[#0A1020] text-slate-400">⏳ {language === 'en' ? 'Pending' : 'लंबित'}</option>
                          <option value="Confirmed" className="bg-[#0A1020] text-emerald-400">✅ {language === 'en' ? 'Confirmed' : 'पुष्ट'}</option>
                          <option value="CANCELLED" className="bg-[#0A1020] text-rose-400">❌ {language === 'en' ? 'Cancelled' : 'रद्द'}</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'wholesale') {
      if (filteredWholesale.length === 0) return <EmptyState tab="Wholesale Queries" isFiltered={wholesaleQueries.length > 0} />;
      return (
        <div>
          {/* Card Layout for Mobile */}
          <div className="block md:hidden space-y-4 p-4">
            {filteredWholesale.map((query, i) => (
              <div key={i} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 space-y-4 shadow-xl hover:border-[#0F766E]/50 transition-all">
                <div className="flex items-start justify-between gap-2 border-b border-[#1E293B]/60 pb-3">
                  <span className="text-[10px] text-slate-450 font-mono font-bold">{query.timestamp || query.created_at}</span>
                  <span className="bg-[#0F766E]/20 text-[#2DD4BF] px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-[#0F766E]/30">B2B Query</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-base tracking-tight">{query.companyName || query.company_name}</h4>
                  <div className="text-xs text-slate-400 font-medium">Contact: <span className="text-slate-200 font-bold">{query.contactName || query.name}</span></div>
                  {query.phone && <div className="text-xs text-slate-350 font-mono font-bold">📞 {query.phone}</div>}
                  {query.email && <div className="text-[10px] text-slate-500 truncate">{query.email}</div>}
                </div>

                <div className="bg-[#0B1120]/60 border border-[#1E293B] rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#2DD4BF] font-black block">📋 Requirements</span>
                    <span className="text-xs text-emerald-400 font-extrabold">Qty: {query.estimatedQuantity || query.quantity}</span>
                  </div>
                  <p className="text-xs text-slate-355 whitespace-pre-wrap leading-relaxed">{query.requirements}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-[#0A1020]">
                <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-bold rounded-tl-2xl">{language === 'en' ? 'Timestamp' : 'समय'}</th>
                  <th className="p-4 font-bold">{t('portal.company')} / {language === 'en' ? 'Contact' : 'संपर्क'}</th>
                  <th className="p-4 font-bold">{language === 'en' ? 'Contact Info' : 'संपर्क जानकारी'}</th>
                  <th className="p-4 font-bold">{language === 'en' ? 'Quantity' : 'मात्रा'}</th>
                  <th className="p-4 font-bold rounded-tr-2xl">{t('portal.details')}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#1E293B]/50">
                {filteredWholesale.map((query, i) => (
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
                      <div className="whitespace-normal min-w-[250px] text-slate-300">
                        {query.requirements}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'pricing') {
      const filteredPrices = medicinePrices.filter(p => 
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.size || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <div className="p-6 space-y-6">
          {/* Add / Edit Form */}
          <form onSubmit={handleAddOrUpdateMedicinePrice} className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4BF] flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {editingMedId ? 'Edit Medicine Price' : 'Add New Medicine Price'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Medicine Name</label>
                <input 
                  type="text" 
                  value={newMedName} 
                  onChange={(e) => setNewMedName(e.target.value)} 
                  placeholder="e.g. Arnica Montana" 
                  className="w-full bg-[#0A1020] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-[#0F766E] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Potency</label>
                <select 
                  value={newMedPotency} 
                  onChange={(e) => setNewMedPotency(e.target.value)} 
                  className="w-full bg-[#0A1020] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#0F766E] transition-colors outline-none font-bold"
                >
                  <option value="30C">30C (Standard Dilution)</option>
                  <option value="200C">200C (Standard Dilution)</option>
                  <option value="1M">1M (High Dilution)</option>
                  <option value="Q">Q (Mother Tincture)</option>
                  <option value="6X">6X (Tissue Salt)</option>
                  <option value="12X">12X (Tissue Salt)</option>
                  <option value="30X">30X (Tissue Salt)</option>
                  <option value="custom">Other / Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Bottle Size</label>
                <select 
                  value={newMedSize} 
                  onChange={(e) => setNewMedSize(e.target.value)} 
                  className="w-full bg-[#0A1020] border border-[#1E293B] rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#0F766E] transition-colors outline-none font-bold"
                >
                  <option value="30ml">30ml (Standard Liquid)</option>
                  <option value="100ml">100ml (Large Liquid)</option>
                  <option value="450ml">450ml (Clinic/Bulk Liquid)</option>
                  <option value="15g (Tablets)">15g (Standard Tablets)</option>
                  <option value="25g (Tablets)">25g (Large Tablets)</option>
                  <option value="custom">Other / Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Price (INR)</label>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 bg-[#0A1020] border border-[#1E293B] rounded-xl px-3 py-2 flex-1 animate-none">
                    <span className="text-emerald-500 font-bold text-xs">₹</span>
                    <input 
                      type="text" 
                      value={newMedPrice} 
                      onChange={(e) => setNewMedPrice(e.target.value)} 
                      placeholder="e.g. 100" 
                      className="w-full bg-transparent border-none text-xs text-white placeholder-slate-650 focus:outline-none outline-none font-bold text-right"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="bg-[#0F766E] hover:bg-[#0D635C] text-white rounded-xl py-2.5 px-6 text-xs font-bold uppercase tracking-widest transition-all shadow-md select-none shrink-0 cursor-pointer"
                  >
                    {editingMedId ? 'Update' : 'Add'}
                  </button>
                  {editingMedId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingMedId(null);
                        setNewMedName('');
                        setNewMedPrice('');
                        setNewMedSize('30ml');
                      }} 
                      className="bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 rounded-xl py-2.5 px-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Database Table */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl">
            {filteredPrices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                No pricing records found. Type to add one above!
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-[#0A1020]">
                    <tr className="border-b border-[#1E293B] text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      <th className="p-4 pl-6">Medicine Name</th>
                      <th className="p-4">Potency</th>
                      <th className="p-4">Bottle Size</th>
                      <th className="p-4">Price (MRP)</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[#1E293B]/50 font-medium">
                    {filteredPrices.map((med, idx) => (
                      <tr key={med.id || idx} className="hover:bg-[#1E293B]/30 transition-colors">
                        <td className="p-4 pl-6 text-white font-extrabold">{med.name}</td>
                        <td className="p-4 text-[#2DD4BF] font-mono font-bold">{med.potency || '—'}</td>
                        <td className="p-4 text-slate-300 font-mono">{med.size}</td>
                        <td className="p-4 text-emerald-400 font-mono font-bold">₹{med.price}</td>
                        <td className="p-4 text-right pr-6 space-x-2">
                          <button 
                            onClick={() => handleEditMedPrice(med)} 
                            className="inline-flex items-center gap-1.5 bg-[#0F766E]/10 border border-[#0F766E]/20 text-[#2DD4BF] hover:bg-[#0F766E]/25 px-3 py-1.5 rounded-lg text-2xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteMedPrice(med.id)} 
                            className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/25 px-3 py-1.5 rounded-lg text-2xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const EmptyState = ({ tab, isFiltered }) => {
    const getEmptyTitle = () => {
      if (isFiltered) return language === 'en' ? 'No Matching Records Found' : 'कोई मेल खाने वाले रिकॉर्ड नहीं मिले';
      if (tab === 'Retail Orders') return language === 'en' ? 'No Retail Orders Logged Yet' : 'अभी तक कोई खुदरा ऑर्डर दर्ज नहीं किया गया है';
      if (tab === 'Consultations') return language === 'en' ? 'No Consultations Logged Yet' : 'अभी तक कोई परामर्श दर्ज नहीं किया गया है';
      return language === 'en' ? 'No Wholesale Queries Logged Yet' : 'अभी तक कोई थोक पूछताछ दर्ज नहीं की गई है';
    };

    const getEmptyDesc = () => {
      if (isFiltered) return language === 'en' ? 'Try adjusting your search query or status filter.' : 'कृपया अपना खोज शब्द या स्थिति फ़िल्टर बदलने का प्रयास करें।';
      if (tab === 'Retail Orders') return language === 'en' ? 'Newly placed orders will appear here automatically. Only the latest 20 items are displayed.' : 'नए ऑर्डर यहां स्वचालित रूप से दिखाई देंगे। केवल नवीनतम 20 आइटम प्रदर्शित किए जाते हैं।';
      if (tab === 'Consultations') return language === 'en' ? 'Newly booked appointments will appear here automatically. Only the latest 20 items are displayed.' : 'नए बुक किए गए अपॉइंटमेंट यहां स्वचालित रूप से दिखाई देंगे। केवल नवीनतम 20 आइटम प्रदर्शित किए जाते हैं।';
      return language === 'en' ? 'Newly placed inquiries will appear here automatically. Only the latest 20 items are displayed.' : 'नई पूछताछ यहां स्वचालित रूप से देगी। केवल नवीनतम 20 आइटम प्रदर्शित किए जाते हैं।';
    };

    return (
      <div className="flex flex-col items-center justify-center py-20 w-full min-h-[300px]">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2">{getEmptyTitle()}</h3>
        <p className="text-xs text-slate-500 font-medium text-center px-4 max-w-md">{getEmptyDesc()}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#060B19] text-white font-sans selection:bg-[#0F766E]/30 relative z-0">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0A1020] border-b border-[#1E293B] shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-h-16 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-[0_0_15px_rgba(15,118,110,0.5)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-wider text-white uppercase flex items-center gap-2">
                KHH <span className="text-[#2DD4BF]">{language === 'en' ? 'PHARMACIST PORTAL' : 'फार्मासिस्ट पोर्टल'}</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {t('portal.adminPortal')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full md:w-auto">
            <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-full p-1 px-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Package className="w-3.5 h-3.5 text-amber-500"/> {language === 'en' ? 'Orders' : 'ऑर्डर'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{retailOrders.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Stethoscope className="w-3.5 h-3.5 text-blue-400"/> {language === 'en' ? 'Consultations' : 'परामर्श'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{consultations.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Briefcase className="w-3.5 h-3.5 text-purple-400"/> {language === 'en' ? 'B2B Inquiries' : 'थोक पूछताछ'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{wholesaleQueries.length}</span></span>
            </div>

            <button 
              onClick={fetchPortalData}
              disabled={syncStatus === 'syncing'}
              className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-[#0F766E] text-[#2DD4BF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#0F766E]/10 transition-colors disabled:opacity-50 min-w-[100px]"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'mock' ? (language === 'en' ? 'Mock Sync' : 'मॉक सिंक') : t('portal.refreshBtn')}
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#31112C] border border-[#701A4B] text-[#F43F5E] text-[10px] font-bold uppercase tracking-wider hover:bg-[#4C1236] transition-colors cursor-pointer min-w-[100px]"
            >
              <Lock className="w-3 h-3" />
              {language === 'en' ? 'Lock Portal' : 'पोर्टल लॉक करें'}
            </button>
            <button 
              onClick={() => { window.location.href = '/' }}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors ml-2 select-none cursor-pointer">
              {language === 'en' ? 'Exit' : 'बाहर'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
        {/* Background Watermark Logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none z-0 mix-blend-screen">
          <img src="/logo.png" alt="Watermark" className="w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] object-contain grayscale" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-2">{language === 'en' ? 'Systems Dashboard' : 'सिस्टम डैशबोर्ड'}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-2">
              {language === 'en' ? 'Manage operational status, client orders, and wholesale inquiries.' : 'परिचालन स्थिति, ग्राहक ऑर्डर और थोक पूछताछ का प्रबंधन करें।'}
              {syncStatus === 'mock' && (
                <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/20"><AlertCircle className="w-3 h-3"/> {language === 'en' ? 'Local Mock Mode' : 'स्थानीय मॉक मोड'}</span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between gap-4 shadow-xl w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white">WhatsApp Gateway</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">API Latency</span>
                <span className="text-xs font-mono font-bold text-[#2DD4BF]">24ms</span>
              </div>
            </div>

            {/* Clinic Override */}
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-xl w-full">
              <div>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="w-3 h-3" /> {t('portal.clinicStatusOverride')}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-650 mt-0.5">
                  {language === 'en' ? 'Force Portal Open Status' : 'पोर्टल खुली स्थिति बाध्य करें'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-[#0B1120] p-1 rounded-lg border border-[#1E293B] w-full sm:w-auto">
                <button onClick={() => handleOverrideStatusChange('auto')} className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${overrideStatus === 'auto' ? 'bg-[#0F766E] text-white shadow-[0_0_10px_rgba(15,118,110,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                  <RefreshCw className="w-3 h-3 text-[#2DD4BF]" /> {language === 'en' ? 'Auto' : 'ऑटो'}
                </button>
                <button onClick={() => handleOverrideStatusChange('open')} className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${overrideStatus === 'open' ? 'bg-[#166534] text-white shadow-[0_0_10px_rgba(22,101,52,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> {t('portal.forceOpen')}
                </button>
                <button onClick={() => handleOverrideStatusChange('closed')} className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${overrideStatus === 'closed' ? 'bg-[#7F1D1D] text-white shadow-[0_0_10px_rgba(127,29,29,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                  <XCircle className="w-3 h-3 text-rose-500" /> {t('portal.forceClosed')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-start sm:justify-center mb-8 relative z-10 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center bg-[#111827] border border-[#1E293B] rounded-xl p-1.5 shadow-lg whitespace-nowrap min-w-max">
            <button 
              onClick={() => { setActiveTab('retail'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'retail' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Package className={`w-4 h-4 ${activeTab === 'retail' ? 'text-white' : 'text-amber-500'}`} />
              {language === 'en' ? 'Retail Orders' : 'खुदरा ऑर्डर'} ({retailOrders.length})
            </button>
            <button 
              onClick={() => { setActiveTab('consultations'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'consultations' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Stethoscope className={`w-4 h-4 ${activeTab === 'consultations' ? 'text-white' : 'text-blue-400'}`} />
              {language === 'en' ? 'Consultations' : 'परामर्श'} ({consultations.length})
            </button>
            <button 
              onClick={() => { setActiveTab('wholesale'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'wholesale' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Briefcase className={`w-4 h-4 ${activeTab === 'wholesale' ? 'text-white' : 'text-purple-400'}`} />
              {language === 'en' ? 'Wholesale Queries' : 'थोक पूछताछ'} ({wholesaleQueries.length})
            </button>
            <button 
              onClick={() => { setActiveTab('pricing'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'pricing' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Database className={`w-4 h-4 ${activeTab === 'pricing' ? 'text-white' : 'text-cyan-400'}`} />
              {language === 'en' ? 'Pricing Database' : 'मूल्य डेटाबेस'} ({medicinePrices.length})
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-center items-stretch md:items-center gap-4 mb-6 relative z-10 w-full">
          <div className="relative w-full md:max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'retail' 
                  ? (language === 'en' ? "Search orders by name, phone, or address..." : "नाम, फोन या पते से ऑर्डर खोजें...") 
                  : activeTab === 'consultations'
                  ? (language === 'en' ? "Search appointments by patient name or phone..." : "मरीज के नाम या फोन से अपॉइंटमेंट खोजें...")
                  : activeTab === 'pricing'
                  ? (language === 'en' ? "Search database by medicine name..." : "दवा के नाम से डेटाबेस खोजें...")
                  : (language === 'en' ? "Search wholesale queries by name, company, or remedies..." : "नाम, कंपनी या दवाओं से थोक पूछताछ खोजें...")
              }
              className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0F766E] transition-colors shadow-lg"
            />
          </div>
          {activeTab !== 'wholesale' && activeTab !== 'pricing' && (
            <div className="relative w-full md:w-auto">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-4 pr-10 text-sm text-white font-semibold focus:outline-none focus:border-[#0F766E] transition-colors cursor-pointer outline-none shadow-lg"
              >
                <option value="ALL">{language === 'en' ? 'Show All Statuses' : 'सभी स्थितियां दिखाएं'}</option>
                <option value="Pending">{language === 'en' ? 'Pending' : 'लंबित'}</option>
                {activeTab === 'retail' ? (
                  <>
                    <option value="Booked">{language === 'en' ? 'Booked' : 'बुक किया गया'}</option>
                    <option value="Out for Delivery">{language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</option>
                    <option value="Out of Stock">{language === 'en' ? 'Out of Stock' : 'स्टॉक में नहीं'}</option>
                    <option value="Delivered">{language === 'en' ? 'Delivered' : 'डिलिवर हो गया'}</option>
                  </>
                ) : (
                  <option value="Confirmed">{language === 'en' ? 'Confirmed' : 'पुष्ट'}</option>
                )}
                <option value="Cancelled">{language === 'en' ? 'Cancelled' : 'रद्द'}</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}
          {activeTab !== 'pricing' && (
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-[#111827] border border-[#1E293B] hover:border-slate-500 rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg select-none cursor-pointer w-full md:w-auto"
            >
              <Download className="w-4 h-4 text-blue-400" />
              {language === 'en' ? 'Export CSV' : 'सीएसवी निर्यात करें'}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-[#1E293B] rounded-2xl min-h-[300px] flex flex-col p-0 overflow-hidden relative z-10 shadow-2xl transition-all">
          {renderActiveTable()}
          {lastSync && !isLoading && (
            <div className="bg-[#0A1020] border-t border-[#1E293B] p-2 px-4 flex justify-end">
              <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest">
                {t('portal.lastUpdated', { time: lastSync })}
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
