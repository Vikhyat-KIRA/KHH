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
      const cleanAptPhone = (apt.patient_phone || '').replace(/[^0-9]/g, '');
      if (!cleanAptPhone) return false;
      return cleanAptPhone.includes(cleanSearch) || cleanSearch.includes(cleanAptPhone);
    });
  },

  // Queries retail orders matching a phone number
  getRetailOrdersByPhone: async (phoneStr) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const all = JSON.parse(localStorage.getItem('retail_orders') || '[]');
    const cleanSearch = phoneStr.replace(/[^0-9]/g, '');
    if (!cleanSearch) return [];
    return all.filter((order) => {
      const cleanOrderPhone = (order.phone || '').replace(/[^0-9]/g, '');
      if (!cleanOrderPhone) return false;
      return cleanOrderPhone.includes(cleanSearch) || cleanSearch.includes(cleanOrderPhone);
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
      created_at: new Date().toISOString(),
      lead_status: 'Pending' // Initial state
    };
    all.push(newOrder);
    localStorage.setItem('retail_orders', JSON.stringify(all));
    return newOrder;
  },

  // Get all retail orders
  getAllRetailOrders: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('retail_orders') || '[]');
  },

  // Get all appointments
  getAllAppointments: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
  },

  // Get all bulk orders
  getAllBulkOrders: async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return JSON.parse(localStorage.getItem('bulk_orders') || '[]');
  },

  // Update retail order price
  updateRetailOrderPrice: async (id, price) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const all = JSON.parse(localStorage.getItem('retail_orders') || '[]');
    const updated = all.map((order) => {
      if (order.id === id) {
        return { ...order, total_price: price };
      }
      return order;
    });
    localStorage.setItem('retail_orders', JSON.stringify(updated));
    return true;
  },

  // Update retail order status
  updateRetailOrderStatus: async (id, status) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const all = JSON.parse(localStorage.getItem('retail_orders') || '[]');
    const updated = all.map((order) => {
      if (order.id === id) {
        return { ...order, lead_status: status, status: status };
      }
      return order;
    });
    localStorage.setItem('retail_orders', JSON.stringify(updated));
    return true;
  },

  // Update appointment status
  updateAppointmentStatus: async (id, status) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const all = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
    const updated = all.map((apt) => {
      if (apt.id === id) {
        return { ...apt, status: status, cancelled: status === 'CANCELLED' };
      }
      return apt;
    });
    localStorage.setItem('clinic_appointments', JSON.stringify(updated));
    return true;
  }
};



export { db, isFirebaseConfigured, mockDb };
