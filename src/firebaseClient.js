import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Double check environment variables using Vite's env system
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase config is fully populated with actual non-placeholder values
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID';

let db = null;
let isFirebaseConfigured = false;

if (isConfigValid) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      getAnalytics(app);
    }
    isFirebaseConfigured = true;
    console.log('✅ Firebase initialized successfully.');
  } catch (error) {
    console.error('❌ Error initializing Firebase client:', error);
  }
} else {
  console.warn(
    '⚠️ Firebase environment variables are missing or use default placeholders. ' +
    'The app will automatically fall back to an integrated localStorage database engine. ' +
    'To hook up real Firebase Firestore, create a .env file with your credentials.'
  );
}

// -------------------------------------------------------------
// Sleek LocalStorage Mock Database Engine
// Perfectly mirrors Firestore collection structure in the browser.
// -------------------------------------------------------------
const mockDb = {
  // Queries appointments matching a date
  getAppointments: async (dateStr) => {
    // Simulate network latency (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));
    const all = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
    return all.filter((apt) => apt.appointment_date === dateStr);
  },

  // Queries appointments matching a phone number
  getAppointmentsByPhone: async (phoneStr) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const all = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
    const cleanSearch = phoneStr.replace(/[^0-9]/g, '');
    if (!cleanSearch) return [];
    return all.filter((apt) => {
      const cleanAptPhone = apt.patient_phone.replace(/[^0-9]/g, '');
      return cleanAptPhone.includes(cleanSearch) || cleanSearch.includes(cleanAptPhone);
    });
  },

  // Adds an appointment
  addAppointment: async (appointment) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const all = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
    const newApt = {
      id: 'mock_apt_' + Math.random().toString(36).substr(2, 9),
      ...appointment,
      created_at: new Date().toISOString()
    };
    all.push(newApt);
    localStorage.setItem('clinic_appointments', JSON.stringify(all));
    return newApt;
  },

  // Adds a B2B bulk order
  addBulkOrder: async (order) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const all = JSON.parse(localStorage.getItem('bulk_orders') || '[]');
    const newOrder = {
      id: 'mock_order_' + Math.random().toString(36).substr(2, 9),
      ...order,
      created_at: new Date().toISOString()
    };
    all.push(newOrder);
    localStorage.setItem('bulk_orders', JSON.stringify(all));
    return newOrder;
  },

  // Adds a retail order
  addRetailOrder: async (order) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const all = JSON.parse(localStorage.getItem('retail_orders') || '[]');
    const newOrder = {
      id: 'mock_retail_' + Math.random().toString(36).substr(2, 9),
      ...order,
      created_at: new Date().toISOString()
    };
    all.push(newOrder);
    localStorage.setItem('retail_orders', JSON.stringify(all));
    return newOrder;
  },

  // Retrieves all retail orders
  getAllRetailOrders: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('retail_orders') || '[]');
  },

  // Retrieves all appointments
  getAllAppointments: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
  },

  // Retrieves all bulk orders (B2B Queries)
  getAllBulkOrders: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('bulk_orders') || '[]');
  },

  // Updates a retail order's status
  updateRetailOrderStatus: async (id, status) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const all = JSON.parse(localStorage.getItem('retail_orders') || '[]');
    const updated = all.map(ord => ord.id === id ? { ...ord, lead_status: status } : ord);
    localStorage.setItem('retail_orders', JSON.stringify(updated));
    return true;
  },

  // Updates an appointment's status
  updateAppointmentStatus: async (id, status) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const all = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
    const updated = all.map(apt => apt.id === id ? { ...apt, status: status } : apt);
    localStorage.setItem('clinic_appointments', JSON.stringify(updated));
    return true;
  }
};

// Seed initial mock booking data so calendar is instantly interactive with pre-booked slots!
if (!localStorage.getItem('clinic_appointments_seeded')) {
  const today = new Date();
  const getFormattedDate = (offsetDays) => {
    const d = new Date();
    d.setDate(today.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const initialAppointments = [
    {
      id: 'seed_1',
      patient_name: 'Johnathan Archer',
      patient_phone: '123-456-7890',
      appointment_date: getFormattedDate(0), // Today
      time_slot: '10:30 AM',
      status: 'Confirmed',
      created_at: new Date().toISOString()
    },
    {
      id: 'seed_2',
      patient_name: 'Dr. Elizabeth T.',
      patient_phone: '987-654-3210',
      appointment_date: getFormattedDate(0), // Today
      time_slot: '02:00 PM',
      status: 'Pending',
      created_at: new Date().toISOString()
    },
    {
      id: 'seed_3',
      patient_name: 'Starfleet Command',
      patient_phone: '555-0199',
      appointment_date: getFormattedDate(1), // Tomorrow
      time_slot: '11:00 AM',
      status: 'Confirmed',
      created_at: new Date().toISOString()
    },
    {
      id: 'seed_4',
      patient_name: 'Janice Lester',
      patient_phone: '444-555-1212',
      appointment_date: getFormattedDate(1), // Tomorrow
      time_slot: '04:30 PM',
      status: 'Pending',
      created_at: new Date().toISOString()
    }
  ];

  localStorage.setItem('clinic_appointments', JSON.stringify(initialAppointments));
  localStorage.setItem('clinic_appointments_seeded', 'true');
}

export { db, isFirebaseConfigured, mockDb };
