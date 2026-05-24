import { useState, useEffect } from 'react';
import { Lock, RefreshCw, Package, Stethoscope, Briefcase, Clock, Search, ChevronDown, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { doc, updateDoc } from 'firebase/firestore';

export default function PharmacistPortal() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('retail');
  const [overrideStatus, setOverrideStatus] = useState('auto');
  
  // Data State
  const [retailOrders, setRetailOrders] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [wholesaleQueries, setWholesaleQueries] = useState([]);
  
  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
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

  // Reset search and status filter when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('ALL');
  }, [activeTab]);

  // Status updaters for Retail Orders in portal
  const handleUpdatePortalOrderStatus = async (orderId, newStatus) => {
    const order = retailOrders.find(o => o.id === orderId);
    if (!order) return;

    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'retail_orders', orderId), {
          lead_status: newStatus,
          status: newStatus
        });
      } else {
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

      // Update local state immediately
      setRetailOrders(prev => prev.map(ord => ord.id === orderId ? { ...ord, status: newStatus, lead_status: newStatus } : ord));
    } catch (err) {
      console.error('Failed to update retail order status from portal:', err);
    }
  };

  // Status updaters for Appointments in portal
  const handleUpdatePortalAptStatus = async (aptId, newStatus) => {
    const apt = consultations.find(a => a.id === aptId);
    if (!apt) return;

    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'clinic_appointments', aptId), {
          status: newStatus,
          cancelled: newStatus === 'CANCELLED'
        });
      } else {
        await mockDb.updateAppointmentStatus(aptId, newStatus);
      }

      // Sync with Google Sheets (fire-and-forget)
      fetch('/api/updateSheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newStatus === 'CANCELLED' ? 'cancel_appointment' : 'appointment',
          data: {
            patient_name: apt.patientName || apt.patient_name,
            patient_phone: apt.patientPhone || apt.patient_phone,
            appointment_date: apt.appointmentDate || apt.appointment_date,
            time_slot: apt.timeSlot || apt.time_slot,
            status: newStatus
          }
        })
      }).catch(e => console.error('Sheets appointment sync failed:', e));

      // Update local state immediately
      setConsultations(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus, cancelled: newStatus === 'CANCELLED' } : a));
    } catch (err) {
      console.error('Failed to update appointment status from portal:', err);
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
          matchesStatus = statusVal.includes('out') || statusVal === 'shipped';
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
    let headers = [];
    let rows = [];
    let filename = '';

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
    if (s.includes('out') || s === 'shipped') {
      return <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/30">{language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</span>;
    }
    if (s.includes('cancel')) {
      return <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-500/30">{language === 'en' ? 'Cancelled' : 'रद्द'}</span>;
    }
    if (s.includes('confirm') || s === 'booked' || s.includes('sched')) {
      return <span className="bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-teal-500/30">{language === 'en' ? 'Booked' : 'बुक किया गया'}</span>;
    }
    return <span className="bg-[#0F766E]/20 text-[#2DD4BF] px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-[#0F766E]/30">{language === 'en' ? 'Pending' : 'लंबित'}</span>;
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
        <div className="w-full overflow-x-auto">
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
                  <td className="p-4">{renderStatus(order.status || order.lead_status)}</td>
                  <td className="p-4">
                    <div className="relative inline-block w-40">
                      <select
                        value={order.status || order.lead_status || 'Pending'}
                        onChange={(e) => handleUpdatePortalOrderStatus(order.id, e.target.value)}
                        className="appearance-none w-full bg-[#0B1120] border border-[#1E293B] hover:border-[#0F766E] rounded-lg py-1.5 px-3 pr-8 text-xs text-white focus:outline-none transition-colors cursor-pointer outline-none font-bold"
                      >
                        <option value="Pending" className="bg-[#0A1020] text-slate-400">⏳ {language === 'en' ? 'Pending' : 'लंबित'}</option>
                        <option value="Booked" className="bg-[#0A1020] text-teal-400">📦 {language === 'en' ? 'Booked' : 'बुक किया गया'}</option>
                        <option value="Out for Delivery" className="bg-[#0A1020] text-amber-500">🚚 {language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</option>
                        <option value="Delivered" className="bg-[#0A1020] text-emerald-400">✅ {language === 'en' ? 'Delivered' : 'डिलिवर हो गया'}</option>
                        <option value="Cancelled" className="bg-[#0A1020] text-rose-400">❌ {language === 'en' ? 'Cancelled' : 'रद्द'}</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'consultations') {
      if (filteredConsults.length === 0) return <EmptyState tab="Consultations" isFiltered={consultations.length > 0} />;
      return (
        <div className="w-full overflow-x-auto">
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
                        value={apt.status || (apt.cancelled ? 'CANCELLED' : 'Pending')}
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
      );
    }

    if (activeTab === 'wholesale') {
      if (filteredWholesale.length === 0) return <EmptyState tab="Wholesale Queries" isFiltered={wholesaleQueries.length > 0} />;
      return (
        <div className="w-full overflow-x-auto">
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
      return language === 'en' ? 'Newly placed inquiries will appear here automatically. Only the latest 20 items are displayed.' : 'नई पूछताछ यहां स्वचालित रूप से दिखाई देगी। केवल नवीनतम 20 आइटम प्रदर्शित किए जाते हैं।';
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
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
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

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-[#111827] border border-[#1E293B] rounded-full p-1 px-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Package className="w-3.5 h-3.5 text-amber-500"/> {language === 'en' ? 'Orders' : 'ऑर्डर'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{retailOrders.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Stethoscope className="w-3.5 h-3.5 text-blue-400"/> {language === 'en' ? 'Consultations' : 'परामर्श'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{consultations.length}</span></span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-2"><Briefcase className="w-3.5 h-3.5 text-purple-400"/> {language === 'en' ? 'B2B Inquiries' : 'थोक पूछताछ'} <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-full text-[10px]">{wholesaleQueries.length}</span></span>
            </div>

            <button 
              onClick={fetchPortalData}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0F766E] text-[#2DD4BF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#0F766E]/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'mock' ? (language === 'en' ? 'Mock Sync' : 'मॉक सिंक') : t('portal.refreshBtn')}
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#31112C] border border-[#701A4B] text-[#F43F5E] text-[10px] font-bold uppercase tracking-wider hover:bg-[#4C1236] transition-colors">
              <Lock className="w-3 h-3" />
              {language === 'en' ? 'Lock Portal' : 'पोर्टल लॉक करें'}
            </button>
            <button 
              onClick={() => { window.location.href = '/' }}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors ml-2 select-none cursor-pointer">
              {language === 'en' ? 'Exit Portal' : 'बाहर निकलें'}
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
            <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">{language === 'en' ? 'Systems Dashboard' : 'सिस्टम डैशबोर्ड'}</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              {language === 'en' ? 'Manage operational status, client orders, and wholesale inquiries.' : 'परिचालन स्थिति, ग्राहक ऑर्डर और थोक पूछताछ का प्रबंधन करें।'}
              {syncStatus === 'mock' && (
                <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/20"><AlertCircle className="w-3 h-3"/> {language === 'en' ? 'Local Mock Mode' : 'स्थानीय मॉक मोड'}</span>
              )}
            </p>
          </div>

          {/* Clinic Override */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-3 flex items-center gap-6 shadow-xl">
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Clock className="w-3 h-3" /> {t('portal.clinicStatusOverride')}
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                {language === 'en' ? 'Force Portal Open Status' : 'पोर्टल खुली स्थिति बाध्य करें'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#0B1120] p-1 rounded-lg border border-[#1E293B]">
              <button onClick={() => setOverrideStatus('auto')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'auto' ? 'bg-[#0F766E] text-white shadow-[0_0_10px_rgba(15,118,110,0.4)]' : 'text-slate-500 hover:text-slate-350'}`}>
                <RefreshCw className="w-3 h-3 text-[#2DD4BF]" /> {language === 'en' ? 'Auto' : 'ऑटो'}
              </button>
              <button onClick={() => setOverrideStatus('open')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'open' ? 'bg-[#166534] text-white shadow-[0_0_10px_rgba(22,101,52,0.4)]' : 'text-slate-500 hover:text-slate-350'}`}>
                <CheckCircle className="w-3 h-3 text-emerald-500" /> {t('portal.forceOpen')}
              </button>
              <button onClick={() => setOverrideStatus('closed')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${overrideStatus === 'closed' ? 'bg-[#7F1D1D] text-white shadow-[0_0_10px_rgba(127,29,29,0.4)]' : 'text-slate-500 hover:text-slate-350'}`}>
                <XCircle className="w-3 h-3 text-rose-500" /> {t('portal.forceClosed')}
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
              {language === 'en' ? 'Retail Orders' : 'खुदरा ऑर्डर'} ({retailOrders.length})
            </button>
            <button 
              onClick={() => setActiveTab('consultations')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'consultations' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Stethoscope className={`w-4 h-4 ${activeTab === 'consultations' ? 'text-white' : 'text-blue-400'}`} />
              {language === 'en' ? 'Consultations' : 'परामर्श'} ({consultations.length})
            </button>
            <button 
              onClick={() => setActiveTab('wholesale')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'wholesale' ? 'bg-[#0F766E] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <Briefcase className={`w-4 h-4 ${activeTab === 'wholesale' ? 'text-white' : 'text-purple-400'}`} />
              {language === 'en' ? 'Wholesale Queries' : 'थोक पूछताछ'} ({wholesaleQueries.length})
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 relative z-10">
          <div className="relative w-full max-w-lg">
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
                  : (language === 'en' ? "Search wholesale queries by name, company, or remedies..." : "नाम, कंपनी या दवाओं से थोक पूछताछ खोजें...")
              }
              className="w-full bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-550 focus:outline-none focus:border-[#0F766E] transition-colors shadow-lg"
            />
          </div>
          {activeTab !== 'wholesale' && (
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-[#111827] border border-[#1E293B] rounded-xl py-3 pl-4 pr-10 text-sm text-white font-semibold focus:outline-none focus:border-[#0F766E] transition-colors cursor-pointer outline-none shadow-lg"
              >
                <option value="ALL">{language === 'en' ? 'Show All Statuses' : 'सभी स्थितियां दिखाएं'}</option>
                <option value="Pending">{language === 'en' ? 'Pending' : 'लंबित'}</option>
                {activeTab === 'retail' ? (
                  <>
                    <option value="Booked">{language === 'en' ? 'Booked' : 'बुक किया गया'}</option>
                    <option value="Out for Delivery">{language === 'en' ? 'Out for Delivery' : 'डिलिवरी के लिए बाहर'}</option>
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
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#111827] border border-[#1E293B] hover:border-slate-500 rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all shadow-lg select-none cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-400" />
            {language === 'en' ? 'Export CSV' : 'सीएसवी निर्यात करें'}
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-[#1E293B] rounded-2xl min-h-[300px] flex flex-col p-0 overflow-hidden relative z-10 shadow-2xl transition-all">
          {renderActiveTable()}
          {lastSync && !isLoading && (
            <div className="bg-[#0A1020] border-t border-[#1E293B] p-2 px-4 flex justify-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                {t('portal.lastUpdated', { time: lastSync })}
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
